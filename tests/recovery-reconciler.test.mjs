import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { reconciliationDecision, reconcileTask } from '../deploy/node01/task-reconciler.mjs';
const now = Date.now();
const task = { id: 't1', organization_id: 'org1', status: 'CLAIMED', state_version: 3, risk_level: 1, approval_required: false, approval_status: 'NOT_REQUIRED', retry_count: 0, max_retries: 2, updated_at: new Date(now - 180000).toISOString() };
test('stale claim retries until bounded limit, then fails', () => {
    assert.equal(reconciliationDecision(task, [], { now, organizationId: 'org1' }).status, 'QUEUED');
    assert.equal(reconciliationDecision({ ...task, retry_count: 2 }, [], { now, organizationId: 'org1' }).status, 'FAILED');
});
test('verified matching RESULT and successful QA complete without re-execution', () => {
    const output = { text: 'verified' };
    const digest = createHash('sha256').update(JSON.stringify(output)).digest('hex');
    const result = { task_id: 't1', sender_organization_id: 'org1', recipient_organization_id: 'org1', message_type: 'RESULT', status: 'COMPLETED', attempt: 1, result_payload: { verified: true, digest, output } };
    const qa = { ...result, message_type: 'REVIEW', result_payload: { passed: true, resultDigest: digest } };
    assert.equal(reconciliationDecision(task, [result, qa], { now, organizationId: 'org1' }).status, 'COMPLETED');
    assert.equal(reconciliationDecision(task, [result, { ...qa, result_payload: { passed: true, resultDigest: 'b'.repeat(64) } }], { now, organizationId: 'org1' }).status, 'QUEUED');
});
test('live lease, foreign org, invalid counter and R3/R4 cannot mutate', () => {
    for (const change of [{ updated_at: new Date(now).toISOString() }, { organization_id: 'other' }, { retry_count: -1 }, { risk_level: 3 }, { risk_level: 4 }]) {
        assert.equal(reconciliationDecision({ ...task, ...change }, [], { now, organizationId: 'org1' }).status, 'NOOP');
    }
});
test('reconciler follows legal transitions, increments retry once, and loses a renewal race safely', async () => {
    const transitions = [];
    let current = { ...task };
    const ports = { loadSteps: async () => [], compareAndSwap: async (old, patch) => {
            assert.equal(old.state_version, current.state_version);
            transitions.push(patch.status);
            current = { ...current, ...patch, state_version: current.state_version + (patch.status !== current.status ? 1 : 0) };
            return { ...current };
        } };
    const result = await reconcileTask(task, ports, { now, organizationId: 'org1' });
    assert.equal(result.applied, true);
    assert.deepEqual(transitions, ['CLAIMED', 'RETRY_WAIT', 'QUEUED']);
    assert.equal(current.retry_count, 1);
    const lost = await reconcileTask(task, { loadSteps: async () => [], compareAndSwap: async () => null }, { now, organizationId: 'org1' });
    assert.equal(lost.applied, false);
});
test('partially persisted verification retries from REVIEWING and fails closed from FINALIZING', () => {
    assert.equal(reconciliationDecision({ ...task, status: 'REVIEWING' }, [], { now, organizationId: 'org1' }).status, 'QUEUED');
    assert.equal(reconciliationDecision({ ...task, status: 'FINALIZING' }, [], { now, organizationId: 'org1' }).status, 'FAILED');
});
