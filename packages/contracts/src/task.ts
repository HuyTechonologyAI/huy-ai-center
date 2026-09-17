import { z } from 'zod';

export const TaskStatusSchema = z.enum([
  'queued',
  'claimed',
  'running',
  'completed',
  'failed',
  'timeout',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskTypeSchema = z.enum([
  'llm_inference',
  'rag_query',
  'workflow_automation',
  'model_training',
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

export const TaskPayloadSchema = z.object({
  prompt: z.string().optional(),
  model: z.string().optional(),
  parameters: z.record(z.unknown()).default({}),
  workflowId: z.string().optional(),
  inputs: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional(),
});
export type TaskPayload = z.infer<typeof TaskPayloadSchema>;

export const TaskResultSchema = z.object({
  output: z.unknown().optional(),
  text: z.string().optional(),
  tokensUsed: z
    .object({
      prompt: z.number().optional(),
      completion: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
  executionTimeMs: z.number().optional(),
  error: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});
export type TaskResult = z.infer<typeof TaskResultSchema>;

export const AITaskSchema = z.object({
  id: z.string().uuid(),
  sourceApp: TaskSourceAppSchema,
  taskType: TaskTypeSchema,
  priority: TaskPrioritySchema.default('normal'),
  status: TaskStatusSchema.default('queued'),
  payload: TaskPayloadSchema,
  result: TaskResultSchema.nullable().optional(),
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
