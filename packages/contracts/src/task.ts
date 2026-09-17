import { z } from 'zod';

// -----------------------------------------------------------------------------
// 1. TASK STATUS ENUM
// -----------------------------------------------------------------------------
export const TaskStatusSchema = z.enum([
  'queued',
  'claimed',
  'running',
  'waiting_approval',
  'completed',
  'failed',
  'cancelled',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// -----------------------------------------------------------------------------
// 2. TASK METADATA & PRIORITY
// -----------------------------------------------------------------------------
export const TaskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskTypeSchema = z.enum([
  'llm_inference',
  'rag_query',
  'workflow_automation',
  'model_training',
  'agent_execution',
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const TaskSourceAppSchema = z.enum([
  'huycncdsai',
  'gvcncdsai',
  'smarttax_ai',
  'control_center',
  'external_api',
]);
export type TaskSourceApp = z.infer<typeof TaskSourceAppSchema>;

// -----------------------------------------------------------------------------
// 3. TASK PAYLOAD & OUTPUT
// -----------------------------------------------------------------------------
export const TaskPayloadSchema = z.object({
  prompt: z.string().optional(),
  model: z.string().optional(),
  parameters: z.record(z.unknown()).default({}),
  workflowId: z.string().optional(),
  agentId: z.string().optional(),
  toolsAllowed: z.array(z.string()).optional(),
  inputs: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional(),
});
export type TaskPayload = z.infer<typeof TaskPayloadSchema>;

export const AIOutputSchema = z.object({
  text: z.string().optional(),
  json: z.unknown().optional(),
  output: z.unknown().optional(), // Alias for json
  model: z.string().optional(),
  tokens: z
    .object({
      prompt: z.number().optional(),
      completion: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
  tokensUsed: z // Alias for tokens
    .object({
      prompt: z.number().optional(),
      completion: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
  latencyMs: z.number().optional(),
  executionTimeMs: z.number().optional(), // Alias for latencyMs
  finishReason: z.string().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  meta: z.record(z.unknown()).optional(),
});
export type AIOutput = z.infer<typeof AIOutputSchema>;

// Backward compatibility alias for TaskResult
export const TaskResultSchema = AIOutputSchema;
export type TaskResult = AIOutput;

// -----------------------------------------------------------------------------
// 4. TASK STEPS (Multi-step pipeline execution)
// -----------------------------------------------------------------------------
export const AITaskStepSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  name: z.string().min(1),
  status: TaskStatusSchema,
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});
export type AITaskStep = z.infer<typeof AITaskStepSchema>;

// -----------------------------------------------------------------------------
// 5. AI TASK
// -----------------------------------------------------------------------------
export const AITaskSchema = z.object({
  id: z.string().uuid(),
  sourceApp: TaskSourceAppSchema,
  taskType: TaskTypeSchema,
  priority: TaskPrioritySchema.default('normal'),
  status: TaskStatusSchema.default('queued'),
  payload: TaskPayloadSchema,
  output: AIOutputSchema.nullable().optional(),
  result: AIOutputSchema.nullable().optional(), // Database alias
  steps: z.array(AITaskStepSchema).default([]),
  claimedByWorkerId: z.string().nullable().optional(),
  claimedAt: z.string().datetime().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  timeoutSeconds: z.number().int().positive().default(300),
  retryCount: z.number().int().nonnegative().default(0),
  maxRetries: z.number().int().nonnegative().default(3),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AITask = z.infer<typeof AITaskSchema>;

export const CreateTaskInputSchema = z.object({
  sourceApp: TaskSourceAppSchema,
  taskType: TaskTypeSchema,
  priority: TaskPrioritySchema.default('normal'),
  payload: TaskPayloadSchema,
  timeoutSeconds: z.number().int().positive().default(300),
  maxRetries: z.number().int().nonnegative().default(3),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

// -----------------------------------------------------------------------------
// 6. QUEUE MESSAGE (Decoupled messaging payload)
// -----------------------------------------------------------------------------
export const QueueMessageSchema = z.object({
  messageId: z.string().uuid(),
  taskId: z.string().uuid(),
  sourceApp: TaskSourceAppSchema,
  taskType: TaskTypeSchema,
  priority: TaskPrioritySchema,
  enqueuedAt: z.string().datetime(),
  attempt: z.number().int().nonnegative().default(1),
  payload: TaskPayloadSchema,
});
export type QueueMessage = z.infer<typeof QueueMessageSchema>;
