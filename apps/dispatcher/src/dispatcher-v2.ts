import { canonicalSha256, classifications, DispatchContextV2, DispatchRequestV2 } from '@huy-ai/contracts';
import type { DispatchDecision, DispatchPorts } from '@huy-ai/contracts';

/** Local-only core. The provider must authenticate org authorization before returning context. */
export async function dispatchV2(input: unknown, ports: DispatchPorts): Promise<DispatchDecision> {
  const deny = (reason: string): DispatchDecision => ({ allowed: false, reason });
  let selected: string;
  const request = DispatchRequestV2.safeParse(input);
  if (!request.success) return deny('INVALID_REQUEST');
  const r = request.data;
  try {
    const parsed = DispatchContextV2.safeParse(await ports.loadContext(r.organization_id));
    if (!parsed.success) return deny('INVALID_CONTEXT');
    const c = parsed.data;
    if (c.organization_id !== r.organization_id) return deny('ORG_MISMATCH');
    if (r.risk_level > c.risk_ceiling || r.risk_level >= 3) return deny('RISK_DENIED');
    if (classifications.indexOf(r.data_classification) > classifications.indexOf(c.data_classification_ceiling)) return deny('CLASSIFICATION_DENIED');
    if (new Set(c.agents.map(a => a.id)).size !== c.agents.length) return deny('AMBIGUOUS_AGENT');
    const eligible = c.agents.filter(a => {
      const card = a.card;
      return a.organization_id === r.organization_id && card.identity.organization_id === r.organization_id
        && a.id === card.agent_id && a.version_agent_id === a.id && a.version === card.version
        && a.current_agent_version_id === a.version_id && a.agent_card_hash === canonicalSha256(card)
        && a.enabled && a.health_status === 'healthy' && r.capabilities.every(cap => card.capabilities.includes(cap))
        && r.risk_level <= card.risk.ceiling && card.risk.allowed_data_classifications.includes(r.data_classification)
        && card.approval.human_required_for.length === 0 && (card.policy_refs?.length ?? 0) === 0;
    }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    if (!eligible.length) return deny('NO_ELIGIBLE_AGENT');
    selected = eligible[0].id;
  } catch { return deny('DEPENDENCY_FAILURE'); }
  try { await ports.execute(selected, r); }
  catch { return deny('EXECUTION_FAILURE'); }
  return { allowed: true, agent_id: selected };
}
