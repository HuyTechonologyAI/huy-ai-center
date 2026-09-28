import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Implementation contract: pure evaluateReadiness(input, now), no I/O or dispatch.
const moduleUrl = new URL('../../config/organization/readiness.ts', import.meta.url).href;
const now = Date.parse('2026-09-28T00:00:00Z');
const sha = createHash('sha256').update('offline evidence').digest('hex');
const fixture = (): any => ({
  tasks: [{ id: 'work', owner: 'qa', capabilities: ['test'], permissions: ['read'], providers: ['primary', 'backup'], budget: 1 }],
  roles: [{ id: 'qa', capabilities: ['test'], permissions: ['read'], ceiling: ['read'], probation: ['p1', 'p2', 'p3'] }],
  providers: ['primary', 'backup'].map(id => ({ id, available: true, authorized: true, capabilities: ['test'], permissions: ['read'], cost: 1 })),
  receipts: ['p1', 'p2', 'p3'].map(id => ({ id, role: 'qa', capability: 'test', reviewer: 'security', verdict: 'PASS',
    verifiedAt: now - 1000, expiresAt: now + 1000, evidence: id, sha256: sha, isolated: true })),
  evidence: { p1: 'offline evidence', p2: 'offline evidence', p3: 'offline evidence' }, revoked: [],
});
async function evaluate(input: any) {
  const { evaluateReadiness } = await import(moduleUrl);
  const before = structuredClone(input);
  const result = await evaluateReadiness(input, now);
  assert.deepEqual(input, before, 'readiness checks must not mutate evidence or permissions');
  return result;
}
test('complete offline evidence releases the gate; outage uses authorized fallback', async () => {
  const input = fixture();
  assert.deepEqual(await evaluate(input), { ready: true, priority: 'TECHNICAL_ROADMAP', blockers: [], selectedProviders: { work: 'primary' } });
  input.providers[0].available = false;
  assert.deepEqual(await evaluate(input), { ready: true, priority: 'TECHNICAL_ROADMAP', blockers: [], selectedProviders: { work: 'backup' } });
});
const failures: Record<string, (x: any) => void> = {
  incompleteCapabilityEvidence: x => { x.tasks[0].capabilities.push('design'); x.roles[0].capabilities.push('design'); x.providers.forEach((p: any) => p.capabilities.push('design')); },
  unowned: x => { x.tasks[0].owner = ''; }, unknownOwner: x => { x.tasks[0].owner = 'missing'; },
  uncovered: x => { x.roles[0].capabilities = []; }, excessive: x => { x.roles[0].permissions.push('admin'); },
  missingPermission: x => { x.roles[0].permissions = []; }, duplicateTask: x => { x.tasks.push({ ...x.tasks[0] }); },
  missingReceipt: x => { x.receipts.pop(); }, failedProbation: x => { x.receipts[0].verdict = 'FAIL'; },
  selfReview: x => { x.receipts[0].reviewer = 'qa'; }, crossRole: x => { x.receipts[0].role = 'data'; },
  expired: x => { x.receipts[0].expiresAt = now; }, future: x => { x.receipts[0].verifiedAt = now + 1; },
  malformedTime: x => { x.receipts[0].expiresAt = 'tomorrow'; }, tampered: x => { x.evidence.p1 = 'changed'; },
  unverifiable: x => { delete x.evidence.p1; }, replay: x => { x.receipts[2] = { ...x.receipts[0] }; },
  wrongCapability: x => { x.receipts[0].capability = 'admin'; }, notIsolated: x => { x.receipts[0].isolated = false; },
  rollbackRevocation: x => { x.revoked = ['p1']; }, noProviders: x => { x.providers = []; },
  outage: x => { x.providers.forEach((p: any) => { p.available = false; }); },
  unauthorizedFallback: x => { x.providers[0].available = false; x.providers[1].authorized = false; },
  expensiveFallback: x => { x.providers[0].available = false; x.providers[1].cost = 2; },
  privilegeFallback: x => { x.providers[0].available = false; x.providers[1].permissions.push('admin'); },
  incapableFallback: x => { x.providers[0].available = false; x.providers[1].capabilities = []; },
  invalidBudget: x => { x.tasks[0].budget = -1; }, unknownProvider: x => { x.tasks[0].providers = ['unknown']; },
  stale: x => { x.receipts[0].verifiedAt = now - 31 * 86400000; }, nonfiniteCost: x => { x.providers.forEach((p: any) => { p.cost = NaN; }); },
  duplicateRole: x => { x.roles.push({ ...x.roles[0] }); }, emptyRequirements: x => { x.tasks[0].capabilities = []; },
  malformedAuthorization: x => { x.providers.forEach((p: any) => { p.authorized = 'true'; }); },
  partiallyCoveredRoadmap: x => { x.tasks.push({ ...x.tasks[0], id: 'other', owner: 'missing' }); },
  malformedAvailability: x => { x.providers.forEach((p: any) => { p.available = 'false'; }); },
  negativeCost: x => { x.providers.forEach((p: any) => { p.cost = -1; }); },
};
for (const [name, mutate] of Object.entries(failures)) test(`readiness blocks ${name}`, async () => {
  const input = fixture(); mutate(input);
  const result = await evaluate(input);
  assert.equal(result.ready, false); assert.equal(result.priority, 'ORG_READINESS');
  assert.deepEqual(result.selectedProviders, {}, 'a blocked gate must not release any work');
  assert.ok(result.blockers.length > 0);
  for (const b of result.blockers) for (const key of ['owner', 'resolution']) assert.ok(typeof b[key] === 'string' && b[key].trim());
});
test('revoking previously accepted evidence restores the readiness gate', async () => {
  const input = fixture(); assert.equal((await evaluate(input)).ready, true); input.revoked = ['p1']; const result = await evaluate(input); assert.equal(result.ready, false); assert.equal(result.priority, 'ORG_READINESS'); assert.deepEqual(result.selectedProviders, {});
});
for (const [index, input] of [null, [], {}, { ...fixture(), tasks: [] }].entries()) test(`malformed readiness fails closed: ${index}`, async () => {
  const result = await evaluate(input);
  assert.equal(result.ready, false); assert.equal(result.priority, 'ORG_READINESS');
});
test('canonical evidence covers every roadmap item and retains gate while blocked', async () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../../config/${p}`, import.meta.url), 'utf8'));
  const roadmap = read('autonomy/system-roadmap.json');
  const evidence = read('organization/readiness-evidence.json');
  assert.deepEqual(evidence.tasks.map((t: any) => t.id).sort(), roadmap.tasks.map((t: any) => t.id).sort());
  for (const task of evidence.tasks) assert.ok(typeof task.owner === 'string' && task.owner.trim());
  const result = await evaluate(evidence);
  assert.equal(evidence.priority, result.priority);
  if (!result.ready) assert.ok(result.blockers.every((b: any) => b.owner?.trim() && b.resolution?.trim()));
});
