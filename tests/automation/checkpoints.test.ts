import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkpointStage, readLatestCheckpoint } from '../../automation/agent-bridge/src/checkpoints.js';
import { enforceEditBudget } from '../../automation/agent-bridge/src/result-auditor.js';

test('checkpoints are linked, append-only, and point to recoverable evidence', () => {
  const root = mkdtempSync(join(tmpdir(), 'bridge-checkpoints-'));
  try {
    const params = { taskId: 'sample-task', owner: 'COORDINATOR', objective: 'Check evidence',
      method: 'validated', result: 'PASS', next: 'PLAN', evidence: { commit: 'abc' } };
    const first = checkpointStage(root, { ...params, stage: 'RECEIVED' });
    const second = checkpointStage(root, { ...params, stage: 'PLAN', evidence: { plan: ['step'] } });
    assert.equal(second.previous_checkpoint_id, first.checkpoint_id);
    assert.equal(readLatestCheckpoint(root, params.taskId)?.checkpoint_id, second.checkpoint_id);
    const prior = join(root, '.artifacts/agent-bridge/checkpoints', params.taskId, `${first.checkpoint_id}.json`);
    assert.equal(JSON.parse(readFileSync(prior, 'utf8')).stage, 'RECEIVED');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('altered evidence stops recovery', () => {
  const root = mkdtempSync(join(tmpdir(), 'bridge-checkpoints-'));
  try {
    const record = checkpointStage(root, { taskId: 'sample-task', stage: 'RECEIVED', owner: 'COORDINATOR',
      objective: 'Review', method: 'validation', result: 'PASS', next: 'IMPLEMENTATION', evidence: { valid: true } });
    writeFileSync(join(root, record.artifact_locations[0]), '{"valid":false}\n');
    assert.throws(() => readLatestCheckpoint(root, 'sample-task'), /CHECKPOINT_ARTIFACT_STALE/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('edit budget rejects oversized changes and oversized new files', () => {
  assert.doesNotThrow(() => enforceEditBudget('diff --git a/a b/a\n+small\n-small'));
  assert.throws(() => enforceEditBudget('diff --git a/a b/a\n' + '+line\n'.repeat(201)), /EDIT_OVER_200_LINES/);
  assert.throws(() => enforceEditBudget('diff --git a/new b/new\nnew file mode 100644\n' + '+line\n'.repeat(201)), /NEW_FILE_OVER_200_LINES/);
});
