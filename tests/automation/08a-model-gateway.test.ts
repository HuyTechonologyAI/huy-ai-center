import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Proposed pure contract: route(request, policy) returns { tier, engine } or throws.
// No provider invocation; config revisions are explicit inputs, allowing rollback.
const policy = () => JSON.parse(readFileSync(new URL('../../config/model-gateway/routing-policy.json', import.meta.url), 'utf8'));
const gateway = () => import('../../packages/model-gateway/src/index.js');
const tiers = ['T0', 'T1', 'T2', 'T3', 'T4'];
const engines = ['deterministic', 'local', 'cloud-economy', 'cloud-premium', 'human'];
const request = (tier = 'T0') => ({ tier, maximumTier: 'T4', budgetUsd: 1, estimatedCostUsd: 0, unavailableTiers: [], fallbackTiers: [] });

test('configuration defines exactly five canonical routes and disables production', () => {
  const p = policy();
  assert.deepEqual(Object.keys(p.routes).sort(), tiers);
  assert.deepEqual(tiers.map(t => p.routes[t].engine), engines);
  assert.equal(p.productionEnabled, false);
  assert.ok(Number.isInteger(p.version) && p.version > 0);
});

test('every tier routes deterministically, with no input or policy mutation', async () => {
  const { route } = await gateway();
  const p = policy(), before = JSON.stringify(p);
  for (const [i, tier] of tiers.entries()) {
    const r = request(tier), snapshot = JSON.stringify(r);
    assert.deepEqual(route(r, p), { tier, engine: engines[i] });
    assert.deepEqual(route(r, p), route(r, p));
    assert.equal(JSON.stringify(r), snapshot);
  }
  assert.equal(JSON.stringify(p), before);
});

test('all tier ceilings are enforced, including human review', async () => {
  const { route } = await gateway();
  for (const [i, maximumTier] of tiers.entries()) for (const [j, tier] of tiers.entries()) {
    const r = { ...request(tier), maximumTier };
    if (j > i) assert.throws(() => route(r, policy()), /TIER_CEILING_EXCEEDED/);
    else assert.equal(route(r, policy()).tier, tier);
  }
});

test('malformed requests and policies fail closed', async () => {
  const { route } = await gateway();
  for (const patch of [{ tier: 'T5' }, { tier: '__proto__' }, { tier: 0 }, { maximumTier: null },
    { budgetUsd: -1 }, { budgetUsd: NaN }, { budgetUsd: Infinity }, { budgetUsd: '1' },
    { estimatedCostUsd: -1 }, { estimatedCostUsd: NaN }, { fallbackTiers: ['T9'] }]) {
    assert.throws(() => route({ ...request(), ...patch }, policy()));
  }
  for (const p of [null, {}, { ...policy(), routes: {} }, { ...policy(), version: -1 }]) {
    assert.throws(() => route(request(), p));
  }
});

test('cost boundaries and provider outages cannot silently widen authority', async () => {
  const { route } = await gateway();
  assert.equal(route({ ...request('T2'), estimatedCostUsd: 1 }, policy()).tier, 'T2');
  assert.throws(() => route({ ...request('T2'), estimatedCostUsd: 1.01 }, policy()));
  assert.throws(() => route({ ...request('T2'), budgetUsd: 0, estimatedCostUsd: 0.01 }, policy()));
  assert.throws(() => route({ ...request('T1'), unavailableTiers: ['T1'] }, policy()));
  assert.throws(() => route({ ...request('T1'), maximumTier: 'T1', unavailableTiers: ['T1'], fallbackTiers: ['T3'] }, policy()));
  assert.equal(route({ ...request('T2'), unavailableTiers: ['T2'], fallbackTiers: ['T1', 'T0'] }, policy()).tier, 'T1');
  assert.throws(() => route({ ...request('T4'), unavailableTiers: ['T4'], fallbackTiers: ['T3'] }, policy()));
});

test('rejected revision does not poison routing after restoring original policy', async () => {
  const { route } = await gateway();
  const original = policy(), before = JSON.stringify(original);
  assert.throws(() => route(request(), { ...original, routes: { T0: { engine: 'cloud-premium' } } }));
  assert.deepEqual(route(request(), original), { tier: 'T0', engine: 'deterministic' });
  assert.equal(JSON.stringify(original), before);
});
