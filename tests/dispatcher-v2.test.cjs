const { test } = require('node:test');
const assert = require('node:assert/strict');
// Proposed local port: dispatchV2(request, { loadContext(orgId), execute(agentId, request) }).
// Context below is normalized test input, NOT an assertion about unresolved SQL mappings.
// Missing/rolled-back schema must reject through loadContext, never use legacy routing.
const fixture = () => {
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
async function run(f, failure) {
  const { dispatchV2 } = require('../apps/dispatcher/dist/dispatcher-v2.js');
  const calls = [];
  for (const a of f.context?.agents ?? []) a.agent_card_hash ??= require('../packages/contracts/dist/canonical-hash.js').canonicalSha256(a.card ?? null);
  const decision = await dispatchV2(f.request, {
    loadContext: async org => { assert.equal(org, f.request.organization_id); if (failure) throw failure; return f.context; },
    execute: async (id, request) => { calls.push(id); assert.deepEqual(request, f.request); return { ok: true }; },
  });
  return { decision, calls };
}
test('V2: valid boundary dispatch executes exactly once', async () => {
  const { decision, calls } = await run(fixture());
  assert.equal(decision.allowed, true); assert.deepEqual(calls, ['agent-a']);
});
test('V2: selection is stable across candidate order', async () => {
  const f = fixture(), other = structuredClone(f.context.agents[0]);
  other.id = other.version_agent_id = other.card.agent_id = 'agent-b'; f.context.agents.push(other);
  const first = await run(f); f.context.agents.reverse(); const second = await run(f);
  assert.equal(first.decision.allowed, true); assert.equal(second.decision.allowed, true);
  assert.equal(first.calls.length, 1); assert.deepEqual(first.calls, second.calls);
});
const cases = [
  ['null request', f => f.request = null], ['missing capabilities', f => delete f.request.capabilities],
  ['missing risk', f => delete f.request.risk_level], ['malformed org', f => f.request.organization_id = {}],
  ['unhealthy card', f => f.context.agents[0].health_status = 'ERROR'],
  ['missing card runtime', f => delete f.context.agents[0].card.runtime],
  ['malformed org policy', f => f.context.data_classification_ceiling = 'UNKNOWN'],
  ['missing org', f => delete f.request.organization_id], ['spoofed org', f => f.context.organization_id = 'other'],
  ['foreign agent', f => f.context.agents[0].organization_id = 'other'],
  ['no eligible agent', f => f.context.agents = []], ['disabled agent', f => f.context.agents[0].enabled = false],
  ['all capabilities required', f => f.request.capabilities.push('unsupported')],
  ['malformed capabilities', f => f.request.capabilities = 'cit_calculation'],
  ...[-1, 1.5, 3, 5, '2', null].map(value => [`invalid/excess risk ${value}`, f => f.request.risk_level = value]),
  ['org risk ceiling', f => f.context.risk_ceiling = 1], ['card risk ceiling', f => f.context.agents[0].card.risk.ceiling = 1],
  ['classification rank', f => f.request.data_classification = 'CONFIDENTIAL'],
  ['unknown classification', f => f.request.data_classification = 'UNKNOWN'],
  ['missing classification', f => delete f.request.data_classification],
  ['card classification scope', f => f.context.agents[0].card.risk.allowed_data_classifications = ['PUBLIC']],
  ['hash mismatch', f => f.context.agents[0].agent_card_hash = '0'.repeat(64)],
  ['unsupported schema', f => f.context.agents[0].card.schema_version = '3.0'],
  ['approval unresolved', f => f.context.agents[0].card.approval.human_required_for = ['REVIEW']],
  ['version owner mismatch', f => f.context.agents[0].version_agent_id = 'other'],
  ['missing policy', f => delete f.context.risk_ceiling], ['missing card', f => delete f.context.agents[0].card],
  ['malformed card', f => f.context.agents[0].card = 'invalid'],
  ['card identity mismatch', f => f.context.agents[0].card.agent_id = 'other'],
  ['card org authorization', f => f.context.agents[0].card.identity.organization_id = 'other'],
  ['malformed card version', f => f.context.agents[0].card.version = 'not-semver'],
  ['stale version after rollback', f => f.context.agents[0].current_agent_version_id = 'rolled-back'],
  ['schema rollback/missing context', f => f.context = null],
  ['dependency failure', () => {}, new Error('SENSITIVE_SENTINEL: schema unavailable')],
];
for (const [name, mutate, failure] of cases) test(`V2 denies: ${name}`, async () => {
  const f = fixture(); mutate(f); const { decision, calls } = await run(f, failure);
  assert.equal(decision.allowed, false); assert.deepEqual(calls, []);
  assert.equal(typeof decision.reason, 'string'); assert.ok(decision.reason.trim());
  assert.doesNotMatch(JSON.stringify(decision), /SENSITIVE_SENTINEL/);
});
test('V2: all classification boundaries and risk zero', async () => {
  for (const classification of ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']) {
    const f = fixture(); f.request.risk_level = 0; f.request.data_classification = classification;
    f.context.data_classification_ceiling = classification; f.context.agents[0].card.risk.allowed_data_classifications = [classification];
    assert.equal((await run(f)).decision.allowed, true);
  }
});
test('V2: execution failures are sanitized and never retried', async () => {
  const f = fixture(); let calls = 0;
  f.context.agents[0].agent_card_hash = require('../packages/contracts/dist/canonical-hash.js').canonicalSha256(f.context.agents[0].card);
  const decision = await require('../apps/dispatcher/dist/dispatcher-v2.js').dispatchV2(f.request, {
    loadContext: async () => f.context, execute: async () => { calls++; throw Error('SENSITIVE_SENTINEL'); },
  });
  assert.deepEqual(decision, { allowed: false, reason: 'EXECUTION_FAILURE' }); assert.equal(calls, 1);
});
