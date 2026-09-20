import { z } from 'zod';

export const HAIP_VERSION = 'HAIP/1.0' as const;

/**
 * 12 Canonical Message Types of HAIP/1.0
 */
export const HaipMessageTypeSchema = z.enum([
  'TASK',
  'PLAN',
  'CLAIM',
  'DELEGATE',
  'TOOL_CALL',
  'RESULT',
  'REVIEW',
  'CORRECTION',
  'STATE_UPDATE',
  'ERROR',
  'FINAL_CANDIDATE',
  'APPROVAL_REQUEST'
]);
export type HaipMessageType = z.infer<typeof HaipMessageTypeSchema>;

/**
 * HAIP Canonical and Failure/Control Task States
 */
export const HaipTaskStateSchema = z.enum([
  // Canonical lifecycle
  'CREATED',
  'PLANNING',
  'QUEUED',
  'CLAIMED',
  'RUNNING',
  'REVIEWING',
  'CORRECTING',
  'FINALIZING',
  'AWAITING_APPROVAL',
  'APPROVED',
  'COMPLETED',
  // Failure / control states
  'RETRY_WAIT',
  'BLOCKED',
  'FAILED',
  'CANCELLED',
  'EXPIRED'
]);
export type HaipTaskState = z.infer<typeof HaipTaskStateSchema>;

/**
 * Risk Model Levels (0 through 4)
 */
export const HaipRiskLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4)
]);
export type HaipRiskLevel = z.infer<typeof HaipRiskLevelSchema>;

export const HaipRiskSchema = z.object({
  level: HaipRiskLevelSchema,
  production: z.boolean(),
  financial: z.boolean(),
  external_action: z.boolean()
});
export type HaipRisk = z.infer<typeof HaipRiskSchema>;

/**
 * Budget and Resource Guard
 */
export const HaipBudgetSchema = z.object({
  max_cost_usd: z.number().nonnegative(),
  max_tokens: z.number().int().positive(),
  max_runtime_seconds: z.number().int().positive().optional(),
  prefer_local: z.boolean().default(true)
});
export type HaipBudget = z.infer<typeof HaipBudgetSchema>;

/**
 * Hops, Retries, and Review Limits
 */
export const HaipLimitsSchema = z.object({
  max_hops: z.number().int().min(1).max(16).default(8),
  max_retries: z.number().int().min(0).max(5).default(3),
  max_review_cycles: z.number().int().min(0).max(3).default(2)
});
export type HaipLimits = z.infer<typeof HaipLimitsSchema>;

/**
 * Entity Endpoint (Sender / Recipient)
 */
export const HaipEndpointTypeSchema = z.enum([
  'orchestrator',
  'planner',
  'agent',
  'tool',
  'dispatcher',
  'human',
  'system',
  'broadcast'
]);
export type HaipEndpointType = z.infer<typeof HaipEndpointTypeSchema>;

export const HaipEndpointSchema = z.object({
  type: HaipEndpointTypeSchema,
  id: z.string().min(1)
});
export type HaipEndpoint = z.infer<typeof HaipEndpointSchema>;

/**
 * Trace and Lineage
 */
export const HaipTraceSchema = z.object({
  hop: z.number().int().nonnegative().default(0),
  parent_message_id: z.string().uuid().optional(),
  route_history: z.array(z.string()).default([])
});
export type HaipTrace = z.infer<typeof HaipTraceSchema>;

/**
 * Artifact Reference
 */
export const HaipArtifactRefSchema = z.object({
  artifact_ref: z.string().min(1),
  artifact_type: z.string().min(1),
  version: z.string().default('1.0.0'),
  checksum: z.string().optional(),
  storage_location: z.string().url().or(z.string().min(1)),
  metadata: z.record(z.unknown()).default({})
});
export type HaipArtifactRef = z.infer<typeof HaipArtifactRefSchema>;

/**
 * Canonical HAIP/1.0 Message Envelope
 */
export const HaipEnvelopeSchema = z.object({
  haip_version: z.literal(HAIP_VERSION),
  message_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  task_id: z.string().uuid(),
  parent_task_id: z.string().uuid().nullable().optional(),
  type: HaipMessageTypeSchema,
  sender: HaipEndpointSchema,
  recipient: HaipEndpointSchema,
  intent: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  input_refs: z.array(z.record(z.unknown())).default([]),
  constraints: z.record(z.unknown()).default({}),
  expected_outputs: z.array(z.record(z.unknown())).default([]),
  budget: HaipBudgetSchema,
  risk: HaipRiskSchema,
  limits: HaipLimitsSchema,
  trace: HaipTraceSchema,
  payload: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().nullable().optional()
});
export type HaipEnvelope = z.infer<typeof HaipEnvelopeSchema>;

/**
 * Human Approval Gate Decisions
 */
export const HaipApprovalDecisionSchema = z.enum([
  'APPROVE',
  'REJECT',
  'REQUEST_REVISION'
]);
export type HaipApprovalDecision = z.infer<typeof HaipApprovalDecisionSchema>;

/**
 * Task Approval Status (Stored in public.ai_tasks.approval_status)
 */
export const HaipApprovalStatusSchema = z.enum([
  'NOT_REQUIRED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REVISION_REQUESTED'
]);
export type HaipApprovalStatus = z.infer<typeof HaipApprovalStatusSchema>;

/**
 * Numeric Priority (1 = Highest / Critical, 5 = Lowest / Background)
 */
export const HaipNumericPrioritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
]);
export type HaipNumericPriority = z.infer<typeof HaipNumericPrioritySchema>;

export function haipPriorityToNumber(p: 'urgent' | 'high' | 'normal' | 'low'): number {
  switch (p) {
    case 'urgent': return 1;
    case 'high': return 2;
    case 'normal': return 3;
    case 'low': return 4;
    default: return 5;
  }
}

export function numberToHaipPriority(n: number): 'urgent' | 'high' | 'normal' | 'low' {
  if (n <= 1) return 'urgent';
  if (n === 2) return 'high';
  if (n <= 4) return 'normal';
  return 'low';
}

/**
 * Agent Card V1 Specification
 */
export const HaipAgentCardSchema = z.object({
  agent_id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().optional(),
  capabilities: z.array(z.string()).min(1),
  accepted_inputs: z.array(
    z.object({
      type: z.string(),
      schema_ref: z.string().optional(),
      required: z.boolean().default(true)
    })
  ),
  output_types: z.array(
    z.object({
      type: z.string(),
      schema_ref: z.string().optional(),
      mime_type: z.string().optional()
    })
  ),
  runtime: z.object({
    type: z.enum([
      'node_worker',
      'langflow',
      'serverless_nextjs',
      'ollama_direct',
      'container_sandbox'
    ]),
    target_node: z.string(),
    memory_mb: z.number().int().min(128).optional(),
    timeout_seconds: z.number().int().min(10).default(300)
  }),
  risk_ceiling: HaipRiskLevelSchema,
  max_parallel_tasks: z.number().int().min(1).max(32).default(2),
  health_status: z.enum(['healthy', 'degraded', 'offline', 'maintenance']).default('healthy'),
  configuration: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({})
});
export type HaipAgentCard = z.infer<typeof HaipAgentCardSchema>;
