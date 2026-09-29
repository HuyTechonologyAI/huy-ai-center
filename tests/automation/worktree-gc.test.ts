import test from 'node:test';
import assert from 'node:assert/strict';
import { selectBridgeWorktreeGcCandidates } from '../../automation/agent-bridge/src/worktree-gc.js';

test('bridge worktree GC preserves newest, dirty, non-ancestor and non-bridge worktrees', () => {
  const now = 1_800_000_000_000;
  const entries = [
    { taskId: 'bridge-e2e-live-newest', path: '/w/newest', branch: 'agent-task/bridge-e2e-live-newest', clean: true, ancestorOfCanonical: true, updatedAtMs: now - 10_000 },
    { taskId: 'bridge-e2e-live-old-clean', path: '/w/old-clean', branch: 'agent-task/bridge-e2e-live-old-clean', clean: true, ancestorOfCanonical: true, updatedAtMs: now - 7_200_000 },
    { taskId: 'bridge-e2e-live-old-dirty', path: '/w/old-dirty', branch: 'agent-task/bridge-e2e-live-old-dirty', clean: false, ancestorOfCanonical: true, updatedAtMs: now - 7_300_000 },
    { taskId: 'bridge-e2e-live-old-unmerged', path: '/w/old-unmerged', branch: 'agent-task/bridge-e2e-live-old-unmerged', clean: true, ancestorOfCanonical: false, updatedAtMs: now - 7_400_000 },
    { taskId: '08a-model-gateway', path: '/w/08a', branch: 'agent-task/08a-model-gateway', clean: true, ancestorOfCanonical: true, updatedAtMs: now - 9_000_000 },
  ];

  const selected = selectBridgeWorktreeGcCandidates(entries, { keepNewest: 1, minAgeMs: 60 * 60_000, now });
  assert.deepEqual(selected.map(x => x.taskId), ['bridge-e2e-live-old-clean']);
});

test('bridge worktree GC never removes anything younger than retention age', () => {
  const now = 1_800_000_000_000;
  const entries = [
    { taskId: 'bridge-e2e-live-a', path: '/w/a', branch: 'agent-task/bridge-e2e-live-a', clean: true, ancestorOfCanonical: true, updatedAtMs: now - 10_000 },
    { taskId: 'bridge-e2e-live-b', path: '/w/b', branch: 'agent-task/bridge-e2e-live-b', clean: true, ancestorOfCanonical: true, updatedAtMs: now - 20_000 },
  ];
  assert.deepEqual(
    selectBridgeWorktreeGcCandidates(entries, { keepNewest: 0, minAgeMs: 60_000, now }),
    []
  );
});
