import type { AgentPlan } from './types.js';
import {
  ALL_PROVIDER_IDS,
  createProviderHealth,
  markProviderFailure,
  markProviderSuccess,
  probeProviders,
  runProviderPrompt,
  selectProvider,
  type AgentRole,
  type ProviderHealth,
  type ProviderId,
  type ProviderRunResult
} from './provider-mesh.js';
import { execCodexTask, type CodexExecRequest } from './codex-adapter.js';
import { redact } from './log-redactor.js';

let meshHealth = createProviderHealth();

export interface MultiAgentExecutionResult {
  provider?: ProviderId;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  blocked: boolean;
  blockReason?:
    | 'ALL_PROVIDERS_UNAVAILABLE'
    | 'HUMAN_AUTH_REQUIRED'
    | 'EXECUTION_FAILED'
    | 'EXECUTION_TIMEOUT';
}

function refreshHealth(): Record<ProviderId, ProviderHealth> {
  meshHealth = probeProviders(meshHealth);
  return meshHealth;
}

function orderedCandidates(
  role: AgentRole,
  exclude: ProviderId[] = []
): ProviderId[] {
  const health = refreshHealth();
  const candidates: ProviderId[] = [];
  const mutable = structuredClone(health);

  while (true) {
    const selected = selectProvider(role, mutable, { exclude: [...exclude, ...candidates] });
    if (!selected) break;
    candidates.push(selected.id);
  }

  return candidates;
}

function parseNumberedPlan(taskId: string, provider: ProviderId, output: string): AgentPlan {
  const clean = redact(output);
  const lines = clean.split('\n').map(x => x.trim()).filter(Boolean);
  const steps = lines
    .filter(line => /^\d+[.)]\s+/.test(line))
    .map((line, index) => ({
      stepIndex: index + 1,
      description: line.replace(/^\d+[.)]\s+/, '').trim(),
      riskEstimate: 'R1' as const
    }));

  return {
    planId: `plan-${taskId}-${provider}-${Date.now()}`,
    taskId,
    model: provider,
    generatedAt: new Date().toISOString(),
    steps,
    requiredTools: [provider],
    approvedByGate: false,
    rawOutput: clean
  };
}

function planningPrompt(req: {
  taskId: string;
  title: string;
  objective: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
}): string {
  return [
    'You are the planning agent in a fail-closed autonomous engineering system.',
    `Task ID: ${req.taskId}`,
    `Title: ${req.title}`,
    `Objective: ${req.objective}`,
    `Allowed paths: ${req.allowedPaths.join(', ') || 'none'}`,
    `Forbidden paths: ${req.forbiddenPaths.join(', ') || 'none'}`,
    '',
    'Produce a minimal implementation plan.',
    'Rules:',
    '- No production mutation.',
    '- No secrets.',
    '- Tests must be designed before production-code edits.',
    '- Remain strictly inside allowed paths.',
    '- Return numbered steps only.'
  ].join('\n');
}

export async function generatePlanMulti(req: {
  taskId: string;
  title: string;
  objective: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
  repositoryRoot: string;
  timeoutSeconds?: number;
}): Promise<AgentPlan> {
  const prompt = planningPrompt(req);
  const candidates = orderedCandidates('PLANNER');

  if (!candidates.length) {
    return {
      planId: `plan-${req.taskId}-all-providers-unavailable`,
      taskId: req.taskId,
      model: 'unavailable',
      generatedAt: new Date().toISOString(),
      steps: [],
      requiredTools: [],
      approvedByGate: false,
      rawOutput: 'ALL_PLANNERS_UNAVAILABLE'
    };
  }

  let sawAuth = false;

  for (const provider of candidates) {
    const result = await runProviderPrompt({
      provider,
      prompt,
      cwd: req.repositoryRoot,
      mode: 'READ_ONLY',
      timeoutMs: (req.timeoutSeconds ?? 120) * 1000
    });

    if (result.success) {
      const plan = parseNumberedPlan(req.taskId, provider, result.output);
      if (plan.steps.length > 0) {
        markProviderSuccess(meshHealth[provider]);
        return plan;
      }
      markProviderFailure(meshHealth[provider], 'PLAN_PARSE_FAILED');
      continue;
    }

    if (result.authRequired) sawAuth = true;
    markProviderFailure(meshHealth[provider], result.error || 'PLAN_EXECUTION_FAILED');
  }

  return {
    planId: `plan-${req.taskId}-planner-failed`,
    taskId: req.taskId,
    model: 'unavailable',
    generatedAt: new Date().toISOString(),
    steps: [],
    requiredTools: [],
    approvedByGate: false,
    rawOutput: sawAuth ? 'HUMAN_AUTH_REQUIRED' : 'ALL_PLANNERS_UNAVAILABLE'
  };
}

export function buildTestDesignPrompt(params: {
  taskId: string;
  objective: string;
  planSteps: Array<{ stepIndex: number; description: string }>;
  allowedPaths: string[];
  forbiddenPaths: string[];
  verification: string[];
}): string {
  return [
    `Task ID: ${params.taskId}`,
    `Objective: ${params.objective}`,
    '',
    'You are the TEST_DESIGNER. This stage runs BEFORE implementation.',
    'Create or update tests only. Do not modify production implementation files.',
    'Predict failure modes, edge cases, security cases, rollback cases and malformed inputs.',
    'Tests should fail against missing/incorrect implementation when applicable.',
    `Allowed paths: ${params.allowedPaths.join(', ')}`,
    `Forbidden paths: ${params.forbiddenPaths.join(', ')}`,
    `Verification commands that will later run: ${params.verification.join(' | ')}`,
    '',
    'Approved plan:',
    ...params.planSteps.map(step => `${step.stepIndex}. ${step.description}`),
    '',
    'If no writable test path is present in the allowed scope, do not edit any file.',
    'Return TEST_PLAN_ONLY and a concise test specification instead.'
  ].join('\n');
}

export async function executeTestDesignMulti(req: {
  taskId: string;
  prompt: string;
  worktreePath: string;
  timeoutSeconds?: number;
}): Promise<MultiAgentExecutionResult> {
  return executeRolePrompt('TEST_DESIGNER', {
    prompt: req.prompt,
    cwd: req.worktreePath,
    mode: 'WORKSPACE_WRITE',
    timeoutMs: (req.timeoutSeconds ?? 900) * 1000
  });
}

export async function executeImplementationMulti(
  req: CodexExecRequest,
  exclude: ProviderId[] = []
): Promise<MultiAgentExecutionResult> {
  const candidates = orderedCandidates('IMPLEMENTER', exclude);
  let sawAuth = false;

  for (const provider of candidates) {
    if (provider === 'codex') {
      const result = await execCodexTask(req);
      if (result.success) {
        markProviderSuccess(meshHealth.codex);
        return {
          provider,
          success: true,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          blocked: false
        };
      }

      if (result.blockReason === 'HUMAN_AUTH_REQUIRED') sawAuth = true;
      markProviderFailure(meshHealth.codex, result.stderr || result.blockReason || 'CODEX_FAILED');
      continue;
    }

    const result = await runProviderPrompt({
      provider,
      prompt: req.prompt,
      cwd: req.worktreePath,
      mode: 'WORKSPACE_WRITE',
      timeoutMs: (req.timeoutSeconds ?? 1800) * 1000
    });

    if (result.success) {
      markProviderSuccess(meshHealth[provider]);
      return normalizeProviderResult(result);
    }

    if (result.authRequired) sawAuth = true;
    markProviderFailure(meshHealth[provider], result.error || 'IMPLEMENTATION_FAILED');
  }

  return {
    success: false,
    stdout: '',
    stderr: sawAuth
      ? 'HUMAN_AUTH_REQUIRED: all viable implementation providers require authentication or failed'
      : 'ALL_PROVIDERS_UNAVAILABLE: no implementation provider completed the task',
    exitCode: null,
    blocked: true,
    blockReason: sawAuth ? 'HUMAN_AUTH_REQUIRED' : 'ALL_PROVIDERS_UNAVAILABLE'
  };
}

function normalizeProviderResult(result: ProviderRunResult): MultiAgentExecutionResult {
  return {
    provider: result.provider,
    success: result.success,
    stdout: result.output,
    stderr: result.error,
    exitCode: result.exitCode,
    blocked: !result.success,
    blockReason: result.authRequired
      ? 'HUMAN_AUTH_REQUIRED'
      : result.retryable
      ? 'EXECUTION_FAILED'
      : 'EXECUTION_FAILED'
  };
}

async function executeRolePrompt(
  role: AgentRole,
  req: { prompt: string; cwd: string; mode: 'READ_ONLY' | 'WORKSPACE_WRITE'; timeoutMs: number },
  exclude: ProviderId[] = []
): Promise<MultiAgentExecutionResult> {
  const candidates = orderedCandidates(role, exclude);
  let sawAuth = false;

  for (const provider of candidates) {
    const result = await runProviderPrompt({
      provider,
      prompt: req.prompt,
      cwd: req.cwd,
      mode: req.mode,
      timeoutMs: req.timeoutMs
    });

    if (result.success) {
      markProviderSuccess(meshHealth[provider]);
      return normalizeProviderResult(result);
    }

    if (result.authRequired) sawAuth = true;
    markProviderFailure(meshHealth[provider], result.error || `${role}_FAILED`);
  }

  return {
    success: false,
    stdout: '',
    stderr: sawAuth ? 'HUMAN_AUTH_REQUIRED' : `ALL_${role}_PROVIDERS_UNAVAILABLE`,
    exitCode: null,
    blocked: true,
    blockReason: sawAuth ? 'HUMAN_AUTH_REQUIRED' : 'ALL_PROVIDERS_UNAVAILABLE'
  };
}

export async function auditResultMulti(req: {
  taskId: string;
  objective: string;
  planSummary?: string;
  diffStat: string;
  reviewDiff?: string;
  verificationSummary: string;
  repositoryRoot: string;
  timeoutSeconds?: number;
  excludeProviders?: ProviderId[];
}): Promise<{
  decision: 'PASS' | 'CORRECTION_REQUIRED' | 'HUMAN_DECISION_REQUIRED' | 'AUDIT_INVALID' | 'HUMAN_AUTH_REQUIRED';
  reason: string;
  provider?: ProviderId;
}> {
  const prompt = [
    'You are an independent reviewer in a fail-closed autonomous engineering system.',
    `Task ID: ${req.taskId}`,
    `Objective: ${req.objective}`,
    `Plan: ${redact(req.planSummary ?? '')}`,
    `Diff stat: ${redact(req.diffStat)}`,
    `Patch: ${redact(req.reviewDiff ?? '')}`,
    `Verification: ${redact(req.verificationSummary)}`,
    '',
    'Check objective, scope, tests, security and absence of false-pass behavior.',
    'Return exactly two lines:',
    'PASS | CORRECTION_REQUIRED | HUMAN_DECISION_REQUIRED',
    'REASON: one concrete reason.'
  ].join('\n');

  const candidates = orderedCandidates('REVIEWER', req.excludeProviders ?? []);
  let sawAuth = false;

  for (const provider of candidates) {
    const result = await runProviderPrompt({
      provider,
      prompt,
      cwd: req.repositoryRoot,
      mode: 'READ_ONLY',
      timeoutMs: (req.timeoutSeconds ?? 120) * 1000
    });

    if (!result.success) {
      if (result.authRequired) sawAuth = true;
      markProviderFailure(meshHealth[provider], result.error || 'AUDIT_FAILED');
      continue;
    }

    const stdout = redact(result.output).trim();
    const match = /^(PASS|CORRECTION_REQUIRED|HUMAN_DECISION_REQUIRED)\s*\r?\nREASON:\s*(.+)$/im.exec(stdout);

    if (!match) {
      markProviderFailure(meshHealth[provider], 'AUDIT_PARSE_FAILED');
      continue;
    }

    markProviderSuccess(meshHealth[provider]);
    return {
      decision: match[1].toUpperCase() as 'PASS' | 'CORRECTION_REQUIRED' | 'HUMAN_DECISION_REQUIRED',
      reason: match[2].slice(0, 500),
      provider
    };
  }

  return sawAuth
    ? { decision: 'HUMAN_AUTH_REQUIRED', reason: 'All available independent reviewers require authentication or failed' }
    : { decision: 'AUDIT_INVALID', reason: 'No independent reviewer produced a valid evidence-backed decision' };
}

export function providerMeshSnapshot(): Record<ProviderId, ProviderHealth> {
  return structuredClone(refreshHealth());
}

export function resetProviderMeshForTests(): void {
  meshHealth = createProviderHealth();
}
