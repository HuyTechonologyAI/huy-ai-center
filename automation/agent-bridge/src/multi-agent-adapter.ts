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
import { runOllamaFileEditor } from './local-ollama-editor.js';
import { redact } from './log-redactor.js';

let meshHealth = createProviderHealth();

export function plannedProviderTimeoutMs(role: AgentRole, requestedMs: number): number {
  const maximum = {
    PLANNER: 120_000, REVIEWER: 240_000, TEST_DESIGNER: 300_000, IMPLEMENTER: 600_000
  }[role];
  return Math.max(1, Math.min(
    Number.isFinite(requestedMs) && requestedMs > 0 ? requestedMs : maximum, maximum
  ));
}

export function providerAttemptTimeoutMs(
  role: AgentRole,
  proven: boolean,
  requestedMs: number,
  provider?: ProviderId
): number {
  const full = plannedProviderTimeoutMs(role, requestedMs);
  if (proven) return full;

  if (provider === 'ollama') {
    const localCpuCap = {
      PLANNER: 120_000,
      REVIEWER: 120_000,
      TEST_DESIGNER: 180_000,
      IMPLEMENTER: 300_000
    }[role];
    return Math.min(full, localCpuCap);
  }

  const cloudCanaryCap = {
    PLANNER: 30_000,
    REVIEWER: 30_000,
    TEST_DESIGNER: 90_000,
    IMPLEMENTER: 120_000
  }[role];
  return Math.min(full, cloudCanaryCap);
}

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

export function providerIsProven(
  provider: ProviderId,
  health: Record<ProviderId, ProviderHealth> = meshHealth
): boolean {
  return Boolean(health[provider]?.lastSuccessAt);
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

export function buildPlanningPrompt(req: {
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
    '- Do not make tool calls; tool calls are strictly forbidden.',
    '- Do not execute shell commands or terminal commands; shell execution is strictly forbidden.',
    '- Do not inspect files or the repository; file and repository inspection are strictly forbidden.',
    '- Generate a parseable numbered plan from prompt context only.',
    '- Return numbered steps only.'
  ].join('\n');
}

export const planningPrompt = buildPlanningPrompt;

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
      timeoutMs: providerAttemptTimeoutMs('PLANNER', providerIsProven(provider), (req.timeoutSeconds ?? 120) * 1000, provider)
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
  const safeTaskId = params.taskId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
  const hasTestScope = params.allowedPaths.some(path =>
    path === 'tests' || path === 'tests/' || path.startsWith('tests/')
  );
  const suggestedTestPath = hasTestScope
    ? `tests/automation/${safeTaskId}.test.ts`
    : null;

  return [
    `Task ID: ${params.taskId}`,
    `Objective: ${params.objective}`,
    '',
    'You are the TEST_DESIGNER. This stage runs BEFORE implementation.',
    'Create or update tests only. Do not modify production implementation files.',
    'Predict failure modes, edge cases, security cases, rollback cases and malformed inputs.',
    'Tests MUST fail against missing or incorrect implementation; never use tautological assertions such as true === true.',
    'Every generated JavaScript/TypeScript test MUST contain at least one executable assert(...) or assert.*(...) call; comments and example assertions do not count.',
    'Every assertion must inspect a real repository artifact using a relative import or node:fs. Do not test placeholder null/object values that are created inside the test.',
    'Do not leave empty assertion callbacks or commented-out examples.',
    'Do not import expect from node:test.',
    'Do not introduce a new test framework or dependency. For JavaScript/TypeScript, use node:test and node:assert/strict.',
    'Use only a recognized test filename (*.test.*, *.spec.*, test_*.py, *_test.*, *.feature, *.snap).',
    'If an approved plan proposes config.json or another non-test filename under tests/, ignore that filename and create a recognized test file instead.',
    ...(suggestedTestPath ? [`Preferred deterministic test path: ${suggestedTestPath}`] : []),
    `Allowed paths: ${params.allowedPaths.join(', ')}`,
    `Forbidden paths: ${params.forbiddenPaths.join(', ')}`,
    `Verification commands that will later run: ${params.verification.join(' | ')}`,
    '',
    'Edit budget rules:',
    '- Work strictly within the pre-implementation budget: produce at most 80 changed lines.',
    '- The hard final total edit budget is 200 lines across tests and implementation combined.',
    '- Prefer concise tests and leave room for implementation.',
    '',
    'Approved plan:',
    ...params.planSteps.map(step => `${step.stepIndex}. ${step.description}`),
    '',
    'If no writable test path is present in the allowed scope, do not edit any file.',
    'Return TEST_PLAN_ONLY and a concise test specification instead.'
  ].join('\n');
}

export function buildLocalTestDesignerPrompt(taskId: string, fullPrompt: string): string {
  const objective = fullPrompt.match(/^Objective:\s*(.+)$/m)?.[1]?.trim() ?? 'Design regression tests for the approved task objective.';
  const verification = fullPrompt.match(/^Verification commands that will later run:\s*(.+)$/m)?.[1]?.trim() ?? 'project verification suite';
  const safeTaskId = taskId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
  return [
    `Task ID: ${taskId}`,
    `Objective: ${objective}`,
    'Role: TEST_DESIGNER. Create tests only; implementation does not exist yet.',
    `Create exactly one concise pre-implementation test file at tests/automation/${safeTaskId}.test.ts.`,
    'Use node:test and node:assert/strict only. Do not import expect.',
    'Tests must inspect real future repository artifacts via node:fs or relative import and must fail while the implementation/config is missing.',
    'Cover the objective with concrete deterministic behavior, malformed inputs, policy ceilings/fail-closed behavior, and local-fallback safety when relevant.',
    'Never create placeholder mocks, empty callbacks, commented-out examples, tautologies, config.json test files, or new dependencies.',
    `Later verification: ${verification}`,
    'Return only the JSON patch envelope required by the repository patch editor.',
  ].join('\n');
}

export async function executeTestDesignMulti(req: {
  taskId: string;
  prompt: string;
  worktreePath: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
  timeoutSeconds?: number;
}): Promise<MultiAgentExecutionResult> {
  return executeRolePrompt('TEST_DESIGNER', {
    prompt: req.prompt,
    localPrompt: buildLocalTestDesignerPrompt(req.taskId, req.prompt),
    cwd: req.worktreePath,
    mode: 'WORKSPACE_WRITE',
    timeoutMs: (req.timeoutSeconds ?? 900) * 1000,
    allowedPaths: req.allowedPaths,
    forbiddenPaths: req.forbiddenPaths,
    maxChangedLines: 80,
    writePolicy: 'TEST_FILES_ONLY',
  });
}

export async function executeImplementationMulti(
  req: CodexExecRequest,
  exclude: ProviderId[] = []
): Promise<MultiAgentExecutionResult> {
  const candidates = orderedCandidates('IMPLEMENTER', exclude);
  let sawAuth = false;

  for (const provider of candidates) {
    if (provider === 'ollama') {
      const local = await runOllamaFileEditor({
        prompt: req.prompt,
        worktreePath: req.worktreePath,
        allowedPaths: req.allowedPaths,
        forbiddenPaths: req.forbiddenPaths,
        timeoutMs: providerAttemptTimeoutMs('IMPLEMENTER', providerIsProven(provider), (req.timeoutSeconds ?? 1800) * 1000, provider),
        maxChangedLines: 200,
      });
      if (local.success) {
        markProviderSuccess(meshHealth.ollama);
        return {
          provider,
          success: true,
          stdout: local.output,
          stderr: '',
          exitCode: 0,
          blocked: false
        };
      }
      markProviderFailure(meshHealth.ollama, local.error || 'LOCAL_OLLAMA_EDITOR_FAILED');
      continue;
    }

    if (provider === 'codex') {
      const result = await execCodexTask({
        ...req,
        timeoutSeconds: providerAttemptTimeoutMs('IMPLEMENTER', providerIsProven(provider), (req.timeoutSeconds ?? 1800) * 1000, provider) / 1000
      });
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
      timeoutMs: providerAttemptTimeoutMs('IMPLEMENTER', providerIsProven(provider), (req.timeoutSeconds ?? 1800) * 1000, provider)
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

export function buildLocalCorrectionPrompt(prompt: string, error: string): string {
  return [
    prompt,
    '',
    'CORRECTION REQUIRED BY HOST VALIDATOR:',
    error,
    'Return a corrected JSON patch only.',
    'For TEST_DESIGNER: use node:test + node:assert/strict, do not import expect, and assert against a real relative import or node:fs artifact.',
  ].join('\n');
}

async function executeRolePrompt(
  role: AgentRole,
  req: {
    prompt: string;
    cwd: string;
    mode: 'READ_ONLY' | 'WORKSPACE_WRITE';
    timeoutMs: number;
    allowedPaths?: string[];
    forbiddenPaths?: string[];
    maxChangedLines?: number;
    writePolicy?: 'ANY_ALLOWED' | 'TEST_FILES_ONLY';
    localPrompt?: string;
  },
  exclude: ProviderId[] = []
): Promise<MultiAgentExecutionResult> {
  const candidates = orderedCandidates(role, exclude);
  let sawAuth = false;

  for (const provider of candidates) {
    if (
      provider === 'ollama' &&
      req.mode === 'WORKSPACE_WRITE' &&
      req.allowedPaths &&
      req.forbiddenPaths
    ) {
      const localRequest = {
        worktreePath: req.cwd,
        allowedPaths: req.allowedPaths,
        forbiddenPaths: req.forbiddenPaths,
        timeoutMs: providerAttemptTimeoutMs(role, providerIsProven(provider), req.timeoutMs, provider),
        maxChangedLines: req.maxChangedLines ?? 80,
        writePolicy: req.writePolicy,
      };
      const localPrompt = req.localPrompt ?? req.prompt;
      let local = await runOllamaFileEditor({ prompt: localPrompt, ...localRequest });
      if (
        !local.success &&
        role === 'TEST_DESIGNER' &&
        /^(?:OLLAMA_EDITOR_JSON_INVALID|Error: LOCAL_TEST_|LOCAL_TEST_)/.test(local.error)
      ) {
        local = await runOllamaFileEditor({
          prompt: buildLocalCorrectionPrompt(localPrompt, local.error),
          ...localRequest,
        });
      }
      if (local.success) {
        markProviderSuccess(meshHealth.ollama);
        return {
          provider,
          success: true,
          stdout: local.output,
          stderr: '',
          exitCode: 0,
          blocked: false,
        };
      }
      markProviderFailure(meshHealth.ollama, local.error || `${role}_LOCAL_EDITOR_FAILED`);
      continue;
    }

    const result = await runProviderPrompt({
      provider,
      prompt: req.prompt,
      cwd: req.cwd,
      mode: req.mode,
      timeoutMs: providerAttemptTimeoutMs(role, providerIsProven(provider), req.timeoutMs, provider)
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

export function parseAuditDecision(stdout: string): {
  decision: 'PASS' | 'CORRECTION_REQUIRED' | 'HUMAN_DECISION_REQUIRED';
  reason: string;
} | null {
  const match = /(?:^|\r?\n)\s*(PASS|CORRECTION_REQUIRED|HUMAN_DECISION_REQUIRED)\s*\r?\n\s*REASON:\s*([^\r\n]+)/im.exec(stdout);
  if (!match) return null;
  return {
    decision: match[1].toUpperCase() as 'PASS' | 'CORRECTION_REQUIRED' | 'HUMAN_DECISION_REQUIRED',
    reason: match[2].trim().slice(0, 500)
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
      timeoutMs: providerAttemptTimeoutMs('REVIEWER', providerIsProven(provider), (req.timeoutSeconds ?? 120) * 1000, provider)
    });

    if (!result.success) {
      if (result.authRequired) sawAuth = true;
      markProviderFailure(meshHealth[provider], result.error || 'AUDIT_FAILED');
      continue;
    }

    const stdout = redact(result.output).trim();
    const parsed = parseAuditDecision(stdout);

    if (!parsed) {
      markProviderFailure(meshHealth[provider], 'AUDIT_PARSE_FAILED');
      continue;
    }

    markProviderSuccess(meshHealth[provider]);
    return {
      ...parsed,
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
