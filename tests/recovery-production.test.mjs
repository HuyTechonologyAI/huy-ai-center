import { canonicalSha256 } from '../packages/contracts/dist/canonical-hash.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runProductionOnce } from '../deploy/node01/production-dispatcher.mjs';
function fixture(overrides = {}) {
    let task = { id: 't1', organization_id: 'org1', idempotency_key: 'key1', status: 'QUEUED', state_version: 0, risk_level: 1, approval_required: false, approval_status: 'NOT_REQUIRED', retry_count: 0, max_retries: 2, assigned_capability: 'summarization', data_classification: 'PUBLIC', input: { prompt: 'Summarize test' }, updated_at: new Date().toISOString(), ...overrides };
    let executions = 0;
    const steps = [];
    const statuses = [];
    const store = { poll: async () => task?.status === 'QUEUED' ? { ...task } : null,
        compareAndSwap: async (old, patch) => { if (old.state_version !== task.state_version || old.updated_at !== task.updated_at)
            return null; task = { ...task, ...patch, state_version: task.state_version + (patch.status !== task.status ? 1 : 0), updated_at: new Date().toISOString() }; statuses.push(task.status); return { ...task }; },
        loadContext: async () => ({}), writeStep: async (t, type, payload) => { steps.push({ type, payload }); },
    };
    const provider = { capabilities: ['summarization'], execute: async () => { executions++; return { text: 'summary' }; } };
    const authorize = async (req, ports) => { await ports.execute('agent1', req); return { allowed: true, agent_id: 'agent1' }; };
    return { store, provider, authorize, organizationId: 'org1', gate: 'OPEN_PRODUCTION', inspect: () => ({ task, executions, steps, statuses }) };
}
test('production poll claim execute verify RESULT QA finalize runs once', async () => {
    const f = fixture();
    assert.equal((await runProductionOnce(f)).status, 'COMPLETED');
    assert.equal((await runProductionOnce(f)).status, 'IDLE');
    assert.equal(f.inspect().executions, 1);
    assert.deepEqual(f.inspect().statuses, ['CLAIMED', 'RUNNING', 'REVIEWING', 'FINALIZING', 'COMPLETED']);
    assert.deepEqual(f.inspect().steps.map(s => s.type), ['RESULT', 'REVIEW']);
});
test('closed gate, R3 R4, foreign org, missing idempotency and unsupported capability never execute', async () => {
    for (const overrides of [{ risk_level: 3 }, { risk_level: 4 }, { organization_id: 'other' }, { idempotency_key: null }, { assigned_capability: 'shell' }]) {
        const f = fixture(overrides);
        await runProductionOnce(f);
        assert.equal(f.inspect().executions, 0);
        assert.equal(f.inspect().task.status, 'QUEUED');
    }
    const f = fixture();
    await runProductionOnce({ ...f, gate: 'CLOSED' });
    assert.equal(f.inspect().executions, 0);
});
test('racing workers cannot execute the same claim twice', async () => {
    const f = fixture();
    await Promise.all([runProductionOnce(f), runProductionOnce(f)]);
    assert.equal(f.inspect().executions, 1);
});
test('provider failure follows legal bounded retry chain', async () => {
    const f = fixture();
    f.provider.execute = async () => { throw new Error('failed'); };
    assert.equal((await runProductionOnce(f)).status, 'RETRY_WAIT');
    assert.deepEqual(f.inspect().statuses, ['CLAIMED', 'RUNNING', 'RETRY_WAIT']);
});
test('lease loss prevents finalization and empty output fails QA', async () => {
    const f = fixture();
    f.provider.execute = async () => ({ text: '' });
    assert.equal((await runProductionOnce(f)).status, 'RETRY_WAIT');
    assert.equal(f.inspect().steps.length, 0);
});
test('lease loss after generation blocks RESULT and completion', async () => {
    const f = fixture();
    const original = f.store.compareAndSwap;
    f.store.compareAndSwap = async (old, patch) => patch.status === 'REVIEWING' || patch.status === 'RETRY_WAIT' ? null : original(old, patch);
    assert.equal((await runProductionOnce(f)).status, 'LEASE_LOST');
    assert.equal(f.inspect().steps.length, 0);
});
test('provider timeout is bounded and never finalizes late output', async () => {
    const f = fixture();
    f.provider.execute = async () => new Promise(() => { });
    assert.equal((await runProductionOnce({ ...f, timeoutMs: 10 })).status, 'RETRY_WAIT');
    assert.equal(f.inspect().steps.length, 0);
});
test('expired task never claims or executes', async () => {
    const f = fixture({ expires_at: new Date(0).toISOString() });
    assert.equal((await runProductionOnce(f)).status, 'TASK_EXPIRED');
    assert.equal(f.inspect().executions, 0);
});
const routingFixture = () => {
    const card = { schema_version: '2.0', agent_id: 'agent-a', version: '1.0.0', display_name: 'Local mock',
        identity: { organization_id: 'org-03-smarttax', hierarchy_level: 1 }, role: 'tester', description: 'Mock',
        capabilities: ['cit_calculation'], accepted_inputs: [], output_types: [],
        runtime: { preferred_model_tier: 'MODEL_TIER_0', execution_environment: 'NODE_LOCAL' },
        risk: { ceiling: 2, allowed_data_classifications: ['INTERNAL'] },
        cost: { cost_center_code: 'CC-03-TEST', maximum_cost_tier: 'T0' },
        delegation: { can_delegate: false, allowed_recipient_levels: [], allowed_recipient_organizations: [] },
        tool_access: { allowed_tools: [], allowed_capabilities: [] }, approval: { human_required_for: [] },
        provenance: { author: 'mock', created_at: '2026-09-28T00:00:00Z', commit_hash: 'mock' } };
    return { request: { organization_id: card.identity.organization_id, capabilities: ['cit_calculation'], risk_level: 2,
            data_classification: 'INTERNAL', payload: { private: 'SENSITIVE_SENTINEL' } },
        context: { organization_id: card.identity.organization_id, risk_ceiling: 2, data_classification_ceiling: 'INTERNAL',
            agents: [{ id: card.agent_id, organization_id: card.identity.organization_id, enabled: true, health_status: 'healthy', version_agent_id: card.agent_id, version: card.version,
                    current_agent_version_id: 'version-a', version_id: 'version-a', card }] } };
};
function realRouting(f) {
    const data = routingFixture();
    const agent = data.context.agents[0];
    data.context.organization_id = 'org1';
    agent.organization_id = 'org1';
    agent.card.identity.organization_id = 'org1';
    agent.card.capabilities = ['summarization'];
    agent.card.risk.allowed_data_classifications = ['PUBLIC'];
    agent.agent_card_hash = canonicalSha256(agent.card);
    f.store.loadContext = async () => data.context;
    delete f.authorize;
    return data;
}
test('real dispatchV2 capability and policy validation executes R0 R1 R2 and blocks bad hashes', async () => {
    for (const risk_level of [0, 1, 2]) {
        const f = fixture({ risk_level });
        realRouting(f);
        assert.equal((await runProductionOnce(f)).status, 'COMPLETED');
        assert.equal(f.inspect().executions, 1);
    }
    const f = fixture();
    const data = realRouting(f);
    data.context.agents[0].agent_card_hash = '0'.repeat(64);
    await runProductionOnce(f);
    assert.equal(f.inspect().executions, 0);
});
