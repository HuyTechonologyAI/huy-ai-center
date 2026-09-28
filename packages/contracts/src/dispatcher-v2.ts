import { z } from 'zod';
const id = z.string().regex(/^[a-z0-9][a-z0-9_.-]*$/);
const ids = z.array(id).refine(a => new Set(a).size === a.length);
const risk = z.number().int().min(0).max(4);
export const classifications = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;
const classification = z.enum(classifications);
const semver = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
const io = z.array(z.object({ type: z.string().min(1), description: z.string(), schema_ref: z.string().optional() }).strict());
export const DispatcherCardV2 = z.object({
  schema_version: z.literal('2.0'), agent_id: id, version: semver, display_name: z.string().min(3).max(100),
  identity: z.object({ organization_id: id, hierarchy_level: risk, department_id: id.nullable().optional() }).strict(),
  role: z.string().min(1), description: z.string(), capabilities: ids, accepted_inputs: io, output_types: io,
  runtime: z.object({ preferred_model_tier: z.enum(['MODEL_TIER_0', 'MODEL_TIER_1', 'MODEL_TIER_2', 'MODEL_TIER_3', 'MODEL_TIER_4']),
    execution_environment: z.enum(['NODE_LOCAL', 'EDGE_SERVERLESS', 'CONTAINER_SANDBOX']),
    timeout_seconds: z.number().int().positive().optional(), max_retries: z.number().int().nonnegative().optional() }).strict(),
  risk: z.object({ ceiling: risk, allowed_data_classifications: z.array(classification).min(1) }).strict(),
  cost: z.object({ cost_center_code: z.string().regex(/^CC-0[1-6]-[A-Z-]+$/), maximum_cost_tier: z.enum(['T0', 'T1', 'T2', 'T3', 'T4']) }).strict(),
  delegation: z.object({ can_delegate: z.boolean(), allowed_recipient_levels: z.array(risk), allowed_recipient_organizations: ids }).strict(),
  tool_access: z.object({ allowed_tools: ids, allowed_capabilities: ids }).strict(),
  approval: z.object({ human_required_for: ids }).strict(), policy_refs: ids.optional(),
  provenance: z.object({ author: z.string().min(1), created_at: z.string().datetime(), commit_hash: z.string().min(1) }).strict(),
}).strict();
export const DispatchRequestV2 = z.object({ organization_id: id, capabilities: ids.refine(a => a.length > 0),
  risk_level: risk, data_classification: classification, payload: z.record(z.unknown()) }).strict();
// Normalized trusted-provider projection; these are not SQL column mappings.
export const DispatchContextV2 = z.object({ organization_id: id, risk_ceiling: risk, data_classification_ceiling: classification,
  agents: z.array(z.object({ id, organization_id: id, enabled: z.boolean(), health_status: z.enum(['healthy', 'degraded', 'offline', 'maintenance']),
    current_agent_version_id: id, version_id: id, version_agent_id: id, version: semver,
    agent_card_hash: z.string().regex(/^[a-f0-9]{64}$/), card: DispatcherCardV2 }).strict()) }).strict();
export type DispatchRequest = z.infer<typeof DispatchRequestV2>;
export type DispatchContext = z.infer<typeof DispatchContextV2>;
export type DispatchDecision = { allowed: true; agent_id: string } | { allowed: false; reason: string };
export interface DispatchPorts {
  loadContext(authorizedOrgId: string): Promise<unknown>;
  execute(agentId: string, request: DispatchRequest): Promise<unknown>;
}
