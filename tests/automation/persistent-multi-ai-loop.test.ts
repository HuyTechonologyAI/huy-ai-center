import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALL_PROVIDER_IDS,
  DEFAULT_ROLE_PRIORITY,
  createProviderHealth,
  markProviderFailure,
  markProviderSuccess,
  selectProvider,
  providerCommandSpec,
  providerStdioSpec,
  detectProviderSemanticFailure,
  parseCodexAuthStatus,
  parseClaudeAuthStatus,
  parseAntigravityAuthStatus,
  isProviderTemporarilyQuarantined
} from '../../automation/agent-bridge/src/provider-mesh.js';

import {
  classifyStall,
  buildBottleneckReport,
  decideSupervisorNextAction,
  type BacklogCycleResult
} from '../../automation/agent-bridge/src/persistent-supervisor.js';

import {
  plannedProviderTimeoutMs,
  providerAttemptTimeoutMs,
  buildPlanningPrompt,
  buildTestDesignPrompt,
  planningPrompt,
  parseAuditDecision
} from '../../automation/agent-bridge/src/multi-agent-adapter.js';

import {
  buildImplementationPrompt
} from '../../automation/agent-bridge/src/codex-adapter.js';

import {
  deterministicFallbackAudit
} from '../../automation/agent-bridge/src/result-auditor.js';

import {
  shouldRunTestDesignOnResume,
  shouldRunPlanOnResume,
  shouldRunImplementationOnResume,
  coordinatorStateChanged
} from '../../automation/agent-bridge/src/task-runner.js';

test('provider mesh registers cloud providers plus local Ollama fallback', () => {
  assert.deepEqual(
    [...ALL_PROVIDER_IDS].sort(),
    ['antigravity', 'chatgpt', 'claude', 'codex', 'gemini', 'ollama'].sort()
  );
  for (const role of ['PLANNER', 'TEST_DESIGNER', 'IMPLEMENTER', 'REVIEWER'] as const) {
    assert.equal(DEFAULT_ROLE_PRIORITY[role].at(-1), 'ollama', `${role} local fallback must be last-resort`);
  }
});

test('role routing prefers specialized agents and fails over without human involvement', () => {
  const now = 1_800_000_000_000;
  const health = createProviderHealth(now);

  for (const id of ALL_PROVIDER_IDS) {
    health[id].available = true;
    health[id].authenticated = true;
  }

  assert.equal(selectProvider('IMPLEMENTER', health, { now })?.id, 'antigravity');
  assert.equal(selectProvider('PLANNER', health, { now })?.id, 'antigravity');

  markProviderFailure(health.antigravity, 'temporary capacity', now, {
    failureThreshold: 1,
    cooldownMs: 60_000
  });

  assert.equal(selectProvider('IMPLEMENTER', health, { now })?.id, 'codex');
  assert.equal(selectProvider('REVIEWER', health, { now, exclude: ['codex'] })?.id, 'gemini');

  markProviderSuccess(health.antigravity, now + 61_000);
  assert.equal(selectProvider('IMPLEMENTER', health, { now: now + 61_000 })?.id, 'antigravity');
});

test('circuit breaker opens after repeated provider failures and recovers after cooldown', () => {
  const now = 1_800_000_000_000;
  const health = createProviderHealth(now);
  const p = health.gemini;
  p.available = true;
  p.authenticated = true;

  markProviderFailure(p, 'fail-1', now, { failureThreshold: 3, cooldownMs: 120_000 });
  markProviderFailure(p, 'fail-2', now + 1, { failureThreshold: 3, cooldownMs: 120_000 });
  assert.equal(p.circuit, 'CLOSED');

  markProviderFailure(p, 'fail-3', now + 2, { failureThreshold: 3, cooldownMs: 120_000 });
  assert.equal(p.circuit, 'OPEN');
  assert.ok((p.cooldownUntil ?? 0) > now);

  assert.equal(selectProvider('TEST_DESIGNER', health, { now: now + 10 })?.id === 'gemini', false);

  markProviderSuccess(p, now + 120_100);
  assert.equal(p.circuit, 'CLOSED');
  assert.equal(p.consecutiveFailures, 0);
});

test('safe command specs never use dangerous blanket permission bypasses', () => {
  for (const id of ALL_PROVIDER_IDS) {
    const spec = providerCommandSpec(id, {
      prompt: 'test',
      cwd: '/tmp/worktree',
      mode: id === 'antigravity' || id === 'chatgpt' ? 'READ_ONLY' : 'WORKSPACE_WRITE'
    });

    const joined = [spec.command, ...spec.args].join(' ').toLowerCase();
    assert.equal(joined.includes('dangerously-skip-permissions'), false, id);
    assert.equal(joined.includes('danger-full-access'), false, id);
    assert.equal(joined.includes('--yolo'), false, id);
  }
});

test('Codex-backed headless providers ignore stdin while stdout and stderr remain piped', () => {
  assert.deepEqual(providerStdioSpec('codex'), ['ignore', 'pipe', 'pipe']);
  assert.deepEqual(providerStdioSpec('ollama'), ['ignore', 'pipe', 'pipe']);

  for (const id of ALL_PROVIDER_IDS) {
    if (id === 'codex' || id === 'ollama') continue;
    assert.deepEqual(providerStdioSpec(id), ['pipe', 'pipe', 'pipe']);
  }
});

test('supervisor continues immediately after a completed task', () => {
  const r: BacklogCycleResult = { status: 'COMPLETED', taskId: 't1' };
  const next = decideSupervisorNextAction(r, { idleMs: 30_000, blockedMs: 60_000 });
  assert.equal(next.state, 'RUNNING');
  assert.equal(next.delayMs, 0);
  assert.equal(next.reason, 'NEXT_DAG_NODE');
});

test('supervisor remains alive at Human Gate without retry-spamming the gated task', () => {
  const r: BacklogCycleResult = { status: 'HUMAN_GATE', taskId: 'prod-deploy' };
  const next = decideSupervisorNextAction(r, { idleMs: 30_000, blockedMs: 60_000 });
  assert.equal(next.state, 'WAITING_HUMAN');
  assert.equal(next.delayMs, 60_000);
  assert.equal(next.notifyHuman, true);
});

test('supervisor retries recoverable AI/provider blockage instead of asking owner to run commands', () => {
  const r: BacklogCycleResult = {
    status: 'BLOCKED',
    taskId: 'feature-a',
    reason: 'CODEX_UNAVAILABLE'
  };
  const next = decideSupervisorNextAction(r, { idleMs: 30_000, blockedMs: 60_000 });
  assert.equal(next.state, 'WAITING_PROVIDER');
  assert.equal(next.notifyHuman, false);
  assert.equal(next.delayMs, 60_000);
});

test('supervisor retries invalid reviewer output without notifying a human', () => {
  const next = decideSupervisorNextAction(
    { status: 'BLOCKED', reason: 'AUDIT_INVALID: reviewer output invalid' },
    { idleMs: 30_000, blockedMs: 60_000 }
  );
  assert.equal(next.state, 'WAITING_PROVIDER');
  assert.equal(next.notifyHuman, false);
});

test('stall classification counts only consecutive identical task, status and reason', () => {
  const current = { taskId: 't1', status: 'BLOCKED', reason: 'CODEX_UNAVAILABLE' };
  const threshold = 3;
  // Planned contract: previous snapshot carries repeatCount; result carries state/repeatCount.
  const first = classifyStall(undefined, current, threshold);
  assert.notEqual(first.state, 'STALLED');
  assert.equal(first.repeatCount, 1);
  for (const repeatCount of [1, 2, 3]) {
    const next = classifyStall({ ...current, repeatCount }, current, threshold);
    assert.equal(next.repeatCount, repeatCount + 1);
    assert.equal(next.state === 'STALLED', repeatCount + 1 >= threshold);
  }
  for (const change of [{ taskId: 't2' }, { status: 'READY' }, { reason: 'AUDIT_INVALID' }]) {
    const next = classifyStall({ ...current, repeatCount: 10 }, { ...current, ...change }, threshold);
    assert.notEqual(next.state, 'STALLED');
    assert.equal(next.repeatCount, 1);
  }
});

test('bottleneck report is deterministic plain data with no sensitive fields', () => {
  const input = {
    taskId: 't1', reason: 'CODEX_UNAVAILABLE', state: 'WAITING_PROVIDER' as const,
    providers: { codex: { available: false, authenticated: false } },
    timestamp: '2026-09-27T00:00:00.000Z'
  };
  const report = buildBottleneckReport(input);
  assert.equal(Object.getPrototypeOf(report), Object.prototype);
  assert.deepEqual(report, buildBottleneckReport(structuredClone(input)));
  assert.deepEqual(Object.keys(report).sort(), [
    'taskId', 'reason', 'supervisorState', 'providers', 'timestamp', 'recommendedAction'
  ].sort());
  assert.deepEqual(report, {
    taskId: input.taskId, reason: input.reason, supervisorState: input.state,
    providers: input.providers, timestamp: input.timestamp, recommendedAction: report.recommendedAction
  });
  assert.equal(typeof report.recommendedAction, 'string');
  assert.ok(report.recommendedAction.trim().length > 0);
  assert.deepEqual(JSON.parse(JSON.stringify(report)), report);
  const checkFields = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key, /env|secret|token|credential/i);
      checkFields(child);
    }
  };
  checkFields(report);
});

test('provider timeouts are positive, finite and capped per role and request', () => {
  for (const role of ['PLANNER', 'REVIEWER', 'TEST_DESIGNER', 'IMPLEMENTER'] as const) {
    const maximum = plannedProviderTimeoutMs(role, Number.MAX_SAFE_INTEGER);
    assert.ok(Number.isFinite(maximum) && maximum > 0 && maximum < Number.MAX_SAFE_INTEGER, role);
    assert.equal(plannedProviderTimeoutMs(role, maximum * 2), maximum, role);
    assert.equal(plannedProviderTimeoutMs(role, maximum), maximum, role);
    for (const requestedMs of [1, maximum / 2]) {
      const timeout = plannedProviderTimeoutMs(role, requestedMs);
      assert.ok(Number.isFinite(timeout) && timeout > 0 && timeout <= requestedMs, role);
    }
  }
});

test('role priority contains independent planner, implementer, test designer and reviewer paths', () => {
  assert.deepEqual(DEFAULT_ROLE_PRIORITY.PLANNER.slice(0, 4), [
    'antigravity', 'gemini', 'claude', 'chatgpt'
  ]);
  assert.deepEqual(DEFAULT_ROLE_PRIORITY.IMPLEMENTER.slice(0, 4), [
    'antigravity', 'codex', 'gemini', 'claude'
  ]);
  assert.ok(DEFAULT_ROLE_PRIORITY.TEST_DESIGNER.includes('gemini'));
  assert.ok(DEFAULT_ROLE_PRIORITY.REVIEWER.includes('chatgpt'));
});


test('provider semantic failure detector converts zero-exit sandbox failures into retryable failover', () => {
  const failure = detectProviderSemanticFailure(
    'codex',
    'TEST_PLAN_ONLY\nShell execution failed with bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted',
    ''
  );
  assert.equal(failure?.retryable, true);
  assert.match(failure?.reason ?? '', /SANDBOX_EXECUTION_FAILED/);

  const antigravityJetskiFailure = detectProviderSemanticFailure(
    'antigravity',
    'no output produced — a tool required the command permission',
    ''
  );
  assert.equal(antigravityJetskiFailure?.retryable, true);
  assert.match(antigravityJetskiFailure?.reason ?? '', /HEADLESS_PERMISSION_DENIED/);

  const antigravityStderrJetskiFailure = detectProviderSemanticFailure(
    'antigravity',
    '',
    'no output produced — a tool required the command permission'
  );
  assert.equal(antigravityStderrJetskiFailure?.retryable, true);
  assert.match(antigravityStderrJetskiFailure?.reason ?? '', /HEADLESS_PERMISSION_DENIED/);

  const antigravityPayloadFailure = detectProviderSemanticFailure(
    'antigravity',
    JSON.stringify({
      denied_actions: [
        { action: 'command', detail: 'action=command: user denied permission to run command' }
      ]
    }),
    ''
  );
  assert.equal(antigravityPayloadFailure?.retryable, true);
  assert.match(antigravityPayloadFailure?.reason ?? '', /HEADLESS_PERMISSION_DENIED/);

  assert.equal(
    detectProviderSemanticFailure('codex', '1. inspect file\n2. edit fixture\n3. verify', ''),
    null
  );

  assert.equal(
    detectProviderSemanticFailure(
      'codex',
      'TEST_PLAN_ONLY',
      'Codex could not find bubblewrap on PATH\nCodex will use the bundled bubblewrap in the meantime'
    ),
    null
  );
});


test('explicit CLI auth parsing fails closed for free or logged-out providers', () => {
  assert.equal(parseCodexAuthStatus(0, 'Logged in using ChatGPT'), true);
  assert.equal(parseCodexAuthStatus(1, 'Not logged in'), false);
  assert.equal(parseClaudeAuthStatus(0, '{"loggedIn":true,"authMethod":"claude.ai"}'), true);
  assert.equal(parseClaudeAuthStatus(1, '{"loggedIn":false,"authMethod":"none"}'), false);
  assert.equal(parseClaudeAuthStatus(0, 'not-json'), false);
  assert.equal(parseAntigravityAuthStatus(0, 'gemini-3.8-flash-high\tGemini 3.8 Flash (High)'), true);
  assert.equal(parseAntigravityAuthStatus(1, 'authentication required'), false);
  assert.equal(parseAntigravityAuthStatus(0, ''), false);
});


test('Antigravity uses plan mode for read-only and accept-edits for implementation', () => {
  const readOnly = providerCommandSpec('antigravity', {
    prompt: 'plan',
    cwd: '/tmp/worktree',
    mode: 'READ_ONLY'
  });
  const writable = providerCommandSpec('antigravity', {
    prompt: 'implement',
    cwd: '/tmp/worktree',
    mode: 'WORKSPACE_WRITE'
  });

  assert.deepEqual(readOnly.args.slice(0, 4), ['-p', 'plan', '--mode', 'plan']);
  assert.deepEqual(readOnly.args.slice(-2), ['--output-format', 'text']);
  assert.ok(writable.args.includes('accept-edits'));
  assert.ok(writable.args.includes('--sandbox'));
  assert.deepEqual(writable.args.slice(-1), ['--sandbox']);
  assert.equal(writable.args.includes('--output-format') && writable.args.includes('stream-json'), true);
  assert.equal(writable.args.includes('--dangerously-skip-permissions'), false);
});

test('planning prompt explicitly forbids tool calls, shell commands, and repository inspection', () => {
  assert.equal(typeof buildPlanningPrompt, 'function');
  assert.equal(typeof planningPrompt, 'function');

  const prompt = buildPlanningPrompt({
    taskId: 'task-plan-headless',
    title: 'Headless planning verification',
    objective: 'Generate plan from prompt context only without tool execution',
    allowedPaths: ['automation/agent-bridge/src'],
    forbiddenPaths: ['/mnt/data2']
  });

  assert.match(prompt, /(?:no|forbid|do not).*tool call/i);
  assert.match(prompt, /(?:no|forbid|do not).*(?:shell|terminal)/i);
  assert.match(prompt, /(?:no|forbid|do not).*(?:repository|file) inspection/i);
  assert.match(prompt, /prompt context only/i);
  assert.match(prompt, /numbered steps only|parseable numbered plan/i);
});

test('edit-budget-aware prompts enforce test designer and implementer line limits', () => {
  assert.equal(typeof buildTestDesignPrompt, 'function');
  assert.equal(typeof buildImplementationPrompt, 'function');

  const testDesignPrompt = buildTestDesignPrompt({
    taskId: 'task-budget-test',
    objective: 'Verify edit budget constraints in prompts',
    planSteps: [
      { stepIndex: 1, description: 'Design test fixture within pre-implementation budget' }
    ],
    allowedPaths: ['tests/automation/persistent-multi-ai-loop.test.ts'],
    forbiddenPaths: ['.env'],
    verification: ['npm test']
  });

  assert.match(testDesignPrompt, /pre-implementation budget/i);
  assert.match(testDesignPrompt, /at most 80 changed lines/i);
  assert.match(testDesignPrompt, /hard final total edit budget is 200 lines/i);

  const implementerPrompt = buildImplementationPrompt({
    taskId: 'task-budget-impl',
    objective: 'Implement feature within edit budget',
    planSteps: [
      { stepIndex: 1, description: 'Implement minimal changes' }
    ],
    allowedPaths: ['automation/agent-bridge/src/codex-adapter.ts'],
    forbiddenPaths: ['.env']
  });

  assert.match(implementerPrompt, /final cumulative diff from HEAD/i);
  assert.match(implementerPrompt, /at or below 200 added\/deleted lines/i);
  assert.match(implementerPrompt, /no new file over 200 lines/i);
  assert.match(implementerPrompt, /git diff --numstat HEAD/);
  assert.match(implementerPrompt, /before finishing/i);
  assert.match(implementerPrompt, /git diff --numstat HEAD.*before finishing/i);
});

test('independent reviewer has a bounded long-review budget', () => {
  assert.equal(plannedProviderTimeoutMs('REVIEWER', Number.MAX_SAFE_INTEGER), 240_000);
  assert.equal(plannedProviderTimeoutMs('REVIEWER', 90_000), 90_000);
});

test('verified TEST_DESIGN checkpoint is not executed again on resume', () => {
  assert.equal(shouldRunTestDesignOnResume(undefined), true);
  assert.equal(shouldRunTestDesignOnResume({ stage: 'PLAN', status: 'VERIFIED' }), true);
  assert.equal(shouldRunTestDesignOnResume({ stage: 'TEST_DESIGN', status: 'VERIFIED' }), false);
  assert.equal(shouldRunTestDesignOnResume({ stage: 'IMPLEMENTATION', status: 'VERIFIED' }), false);
  assert.equal(shouldRunTestDesignOnResume({ stage: 'CROSS_REVIEW', status: 'VERIFIED' }), false);
  assert.equal(shouldRunTestDesignOnResume({ stage: 'DELIVERY', status: 'VERIFIED' }), false);
});

test('verified PLAN checkpoint is not planned again on resume', () => {
  assert.equal(shouldRunPlanOnResume(undefined), true);
  assert.equal(shouldRunPlanOnResume({ stage: 'RECEIVED', status: 'VERIFIED' }), true);
  assert.equal(shouldRunPlanOnResume({ stage: 'PLAN', status: 'VERIFIED' }), false);
  assert.equal(shouldRunPlanOnResume({ stage: 'DECOMPOSITION', status: 'VERIFIED' }), false);
  assert.equal(shouldRunPlanOnResume({ stage: 'TEST_DESIGN', status: 'VERIFIED' }), false);
  assert.equal(shouldRunPlanOnResume({ stage: 'IMPLEMENTATION', status: 'VERIFIED' }), false);
  assert.equal(shouldRunPlanOnResume({ stage: 'CROSS_REVIEW', status: 'VERIFIED' }), false);
  assert.equal(shouldRunPlanOnResume({ stage: 'DELIVERY', status: 'VERIFIED' }), false);
});

test('verified IMPLEMENTATION or CROSS_REVIEW checkpoint is not implemented again on resume', () => {
  assert.equal(shouldRunImplementationOnResume(undefined), true);
  assert.equal(shouldRunImplementationOnResume({ stage: 'PLAN', status: 'VERIFIED' }), true);
  assert.equal(shouldRunImplementationOnResume({ stage: 'DECOMPOSITION', status: 'VERIFIED' }), true);
  assert.equal(shouldRunImplementationOnResume({ stage: 'TEST_DESIGN', status: 'VERIFIED' }), true);
  assert.equal(shouldRunImplementationOnResume({ stage: 'IMPLEMENTATION', status: 'VERIFIED' }), false);
  assert.equal(shouldRunImplementationOnResume({ stage: 'CROSS_REVIEW', status: 'VERIFIED' }), false);
  assert.equal(shouldRunImplementationOnResume({ stage: 'DELIVERY', status: 'VERIFIED' }), false);
});


test('coordinator baseline guard is reusable across planning and audit phases', () => {
  const baseline = ' M docs/example.md';
  assert.equal(coordinatorStateChanged(baseline, baseline), false);
  assert.equal(coordinatorStateChanged(baseline, baseline + '\n?? unexpected.txt'), true);
});

test('audit parser accepts evidence-backed decisions wrapped by harmless provider formatting', () => {
  assert.deepEqual(parseAuditDecision('PASS\nREASON: verification evidence is complete'), {
    decision: 'PASS', reason: 'verification evidence is complete'
  });
  assert.deepEqual(parseAuditDecision('\`\`\`text\nPASS\nREASON: scoped diff and tests pass\n\`\`\`'), {
    decision: 'PASS', reason: 'scoped diff and tests pass'
  });
  assert.deepEqual(parseAuditDecision('Reviewer result:\nCORRECTION_REQUIRED\nREASON: missing rollback evidence\nmetadata: done'), {
    decision: 'CORRECTION_REQUIRED', reason: 'missing rollback evidence'
  });
  assert.equal(parseAuditDecision('PASS'), null);
  assert.equal(parseAuditDecision('PASS | CORRECTION_REQUIRED | HUMAN_DECISION_REQUIRED\nREASON: template only'), null);
});

test('provider eligibility is not hard-coded to a calendar quota window', () => {
  assert.equal(isProviderTemporarilyQuarantined('antigravity', Date.parse('2026-09-28T00:00:00+07:00')), false);
  assert.equal(isProviderTemporarilyQuarantined('antigravity', Date.parse('2026-09-30T11:59:59+07:00')), false);
  assert.equal(isProviderTemporarilyQuarantined('codex', Date.parse('2026-09-29T00:00:00+07:00')), false);
});

test('quota and usage-limit failures open the provider circuit immediately', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');
  const health = createProviderHealth(now).codex;
  health.available = true;
  health.authenticated = true;
  markProviderFailure(health, 'PROVIDER_CAPACITY_WAIT:codex usage limit exceeded', now);
  assert.equal(health.circuit, 'OPEN');
  assert.equal(health.consecutiveFailures, 1);
  assert.ok((health.cooldownUntil ?? 0) >= now + 60_000);
});

test('router prefers a previously proven provider before an unproven higher-priority provider', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');
  const health = createProviderHealth(now);
  for (const id of ['antigravity', 'codex'] as const) {
    health[id].available = true;
    health[id].authenticated = true;
  }
  health.codex.lastSuccessAt = now - 1_000;
  const selected = selectProvider('IMPLEMENTER', health, { now });
  assert.equal(selected?.id, 'codex');
});

test('unproven providers receive bounded canary time before failover', () => {
  const full = plannedProviderTimeoutMs('IMPLEMENTER', 600_000);
  assert.equal(full, 600_000);
  assert.equal(providerAttemptTimeoutMs('PLANNER', false, 120_000), 30_000);
  assert.equal(providerAttemptTimeoutMs('REVIEWER', false, 240_000), 30_000);
  assert.equal(providerAttemptTimeoutMs('TEST_DESIGNER', false, 300_000), 90_000);
  assert.equal(providerAttemptTimeoutMs('IMPLEMENTER', false, 600_000), 120_000);
  assert.equal(providerAttemptTimeoutMs('IMPLEMENTER', true, 600_000), 600_000);
});

test('deterministic fallback reviewer passes only bounded R0-R2 evidence with green verification', () => {
  const base = {
    risk: 'R2' as const,
    changedFiles: ['config/organization/core_team_roster.json'],
    allowedPaths: ['config/organization/'],
    forbiddenPaths: ['.env', 'secrets/', 'supabase/migrations/'],
    reviewDiff: 'diff --git a/a b/a\n+safe line',
    verificationResults: [{ command: 'npm run typecheck', exitCode: 0, passed: true, durationMs: 1 }]
  };
  assert.deepEqual(deterministicFallbackAudit(base), {
    decision: 'PASS',
    reason: 'Deterministic QA/Security fallback: scope, edit budget, sensitive-diff check and required verifications passed'
  });
  assert.equal(deterministicFallbackAudit({ ...base, risk: 'R3' as const }).decision, 'AUDIT_INVALID');
  assert.equal(deterministicFallbackAudit({ ...base, verificationResults: [{ command: 'npm run typecheck', exitCode: 1, passed: false, durationMs: 1 }] }).decision, 'AUDIT_INVALID');
  assert.equal(deterministicFallbackAudit({ ...base, changedFiles: ['secrets/key.txt'] }).decision, 'AUDIT_INVALID');
});

test('local Ollama fallback uses Codex OSS sandbox without cloud auth or permission bypass', () => {
  const read = providerCommandSpec('ollama' as never, {
    prompt: 'plan safely', cwd: '/tmp/worktree', mode: 'READ_ONLY'
  }) as { command: string; args: string[]; env?: Record<string, string> };
  assert.equal(read.command, 'codex');
  assert.ok(read.args.includes('exec'));
  assert.ok(read.args.includes('--oss'));
  assert.ok(read.args.includes('--local-provider'));
  assert.ok(read.args.includes('ollama'));
  assert.ok(read.args.includes('-m'));
  assert.ok(read.args.includes('qwen2.5-coder:3b'));
  assert.ok(read.args.includes('read-only'));
  assert.equal(read.env, undefined);

  const write = providerCommandSpec('ollama' as never, {
    prompt: 'edit safely', cwd: '/tmp/worktree', mode: 'WORKSPACE_WRITE'
  }) as { command: string; args: string[]; env?: Record<string, string> };
  const joined = write.args.join(' ');
  assert.match(joined, /workspace-write/);
  assert.doesNotMatch(joined, /dangerously-skip-permissions|bypassPermissions|--yolo/i);
});

test('local Ollama provider is selected when every cloud route is unavailable', () => {
  const now = Date.parse('2026-09-28T14:00:00Z');
  const health = createProviderHealth(now) as Record<string, any>;
  for (const id of ['codex', 'claude', 'antigravity', 'gemini', 'chatgpt']) {
    health[id].available = false;
    health[id].authenticated = false;
  }
  health.ollama.available = true;
  health.ollama.authenticated = true;
  assert.equal(selectProvider('IMPLEMENTER', health as never, { now })?.id, 'ollama');
  assert.equal(selectProvider('PLANNER', health as never, { now })?.id, 'ollama');
});
