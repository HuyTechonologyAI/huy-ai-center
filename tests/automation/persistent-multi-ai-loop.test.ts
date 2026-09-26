import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALL_PROVIDER_IDS,
  DEFAULT_ROLE_PRIORITY,
  createProviderHealth,
  markProviderFailure,
  markProviderSuccess,
  selectProvider,
  providerCommandSpec
} from '../../automation/agent-bridge/src/provider-mesh.js';

import {
  decideSupervisorNextAction,
  type BacklogCycleResult
} from '../../automation/agent-bridge/src/persistent-supervisor.js';

test('provider mesh registers all five autonomous AI providers', () => {
  assert.deepEqual(
    [...ALL_PROVIDER_IDS].sort(),
    ['antigravity', 'chatgpt', 'claude', 'codex', 'gemini'].sort()
  );
});

test('role routing prefers specialized agents and fails over without human involvement', () => {
  const now = 1_800_000_000_000;
  const health = createProviderHealth(now);

  for (const id of ALL_PROVIDER_IDS) {
    health[id].available = true;
    health[id].authenticated = true;
  }

  assert.equal(selectProvider('IMPLEMENTER', health, { now })?.id, 'codex');
  assert.equal(selectProvider('PLANNER', health, { now })?.id, 'antigravity');

  markProviderFailure(health.codex, 'temporary capacity', now, {
    failureThreshold: 1,
    cooldownMs: 60_000
  });

  assert.equal(selectProvider('IMPLEMENTER', health, { now })?.id, 'claude');
  assert.equal(selectProvider('REVIEWER', health, { now, exclude: ['claude'] })?.id, 'gemini');

  markProviderSuccess(health.codex, now + 61_000);
  assert.equal(selectProvider('IMPLEMENTER', health, { now: now + 61_000 })?.id, 'codex');
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

test('role priority contains independent planner, implementer, test designer and reviewer paths', () => {
  assert.deepEqual(DEFAULT_ROLE_PRIORITY.PLANNER.slice(0, 4), [
    'antigravity', 'gemini', 'claude', 'chatgpt'
  ]);
  assert.deepEqual(DEFAULT_ROLE_PRIORITY.IMPLEMENTER.slice(0, 3), [
    'codex', 'claude', 'gemini'
  ]);
  assert.ok(DEFAULT_ROLE_PRIORITY.TEST_DESIGNER.includes('gemini'));
  assert.ok(DEFAULT_ROLE_PRIORITY.REVIEWER.includes('chatgpt'));
});
