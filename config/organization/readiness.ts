import { createHash } from 'node:crypto';
type Row = Record<string, unknown>;
type Blocker = { owner: string; resolution: string };
const string = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const strings = (x: unknown): x is string[] => Array.isArray(x) && x.every(string) && new Set(x).size === x.length;
const rows = (x: unknown): x is Row[] => Array.isArray(x) && x.every(r => r && typeof r === 'object' && string(r.id)) && new Set(x.map(r => r.id)).size === x.length;
const subset = (a: unknown, b: unknown): boolean => strings(a) && strings(b) && a.every(v => b.includes(v));
const money = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
/** Pure snapshot assessment; callers must establish evidence provenance before runtime activation. */
export function evaluateReadiness(input: unknown, now: number) {
  const blockers: Blocker[] = [];
  const selectedProviders: Record<string, string> = {};
  const block = (owner: string, resolution: string) => { blockers.push({ owner, resolution }); };
  const result = () => ({ ready: !blockers.length, priority: blockers.length ? 'ORG_READINESS' : 'TECHNICAL_ROADMAP', blockers, selectedProviders: blockers.length ? {} : selectedProviders });
  const x = input as Row | null;
  if (!x || !Number.isFinite(now) || !rows(x.tasks) || !x.tasks.length || !rows(x.roles) || !rows(x.providers) || !rows(x.receipts) || !strings(x.revoked) || !x.evidence || typeof x.evidence !== 'object') {
    block('ai-hr-001', 'Supply complete, unique, well-formed readiness records.'); return result();
  }
  const evidence = x.evidence as Row, providers = x.providers, receipts = x.receipts;
  for (const task of x.tasks) {
    const owner = string(task.owner) ? task.owner : 'ai-hr-001';
    const fail = (reason: string) => block(owner, `${task.id}: ${reason}`);
    const role = x.roles.find(r => r.id === task.owner);
    if (!role || !strings(task.capabilities) || !task.capabilities.length || !subset(task.capabilities, role.capabilities)) { fail('Verify owner and required capability coverage.'); continue; }
    if (!subset(role.permissions, role.ceiling) || !subset(task.permissions, role.permissions) || !subset(role.permissions, task.permissions)) fail('Approve exact task permissions within the role ceiling.');
    if (!strings(role.probation) || role.probation.length !== 3) fail('Reference three distinct probation receipts.');
    else for (const id of role.probation) {
      const r = x.receipts.find(r => r.id === id);
      if (!r || r.role !== owner || !task.capabilities.includes(String(r.capability)) || !string(r.reviewer) || r.reviewer === owner || r.verdict !== 'PASS' || r.isolated !== true || x.revoked.includes(id)
        || typeof r.verifiedAt !== 'number' || !Number.isFinite(r.verifiedAt) || r.verifiedAt > now || now - r.verifiedAt > 30 * 86400000
        || typeof r.expiresAt !== 'number' || !Number.isFinite(r.expiresAt) || r.expiresAt <= now || !string(r.evidence) || !Object.hasOwn(evidence, r.evidence) || !string(evidence[r.evidence])
        || createHash('sha256').update(evidence[r.evidence] as string).digest('hex') !== r.sha256) fail(`Provide valid independently reviewed, current, isolated receipt ${id} and matching evidence bytes.`);
    }
    if (strings(role.probation) && task.capabilities.some(cap => !receipts.some(r => role.probation instanceof Array && role.probation.includes(r.id) && r.capability === cap))) fail('Supply probation coverage for every required capability.');
    const eligible = (p: Row) => p.available === true && p.authorized === true && subset(task.capabilities, p.capabilities) && subset(p.permissions, task.permissions) && subset(task.permissions, p.permissions) && money(p.cost) && money(task.budget) && p.cost <= task.budget;
    const chain = strings(task.providers) ? task.providers.map(id => providers.find(p => p.id === id)) : [];
    const provider = chain.find(p => p && eligible(p));
    if (!provider) fail('Verify an available authorized provider within exact permission and per-task budget limits.');
    else selectedProviders[String(task.id)] = String(provider.id);
  }
  return result();
}
