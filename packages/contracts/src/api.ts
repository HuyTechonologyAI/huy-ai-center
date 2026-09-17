import { z } from 'zod';
import { TaskStatusSchema } from './task.js';

// -----------------------------------------------------------------------------
// 1. STANDARD ERROR MODEL
// -----------------------------------------------------------------------------
export const ErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INSUFFICIENT_CREDITS',
  'INVALID_INPUT',
  'PAYLOAD_TOO_LARGE',
  'TASK_NOT_FOUND',
  'TASK_ALREADY_FINISHED',
  'RATE_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const StandardErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1),
  retryable: z.boolean(),
  request_id: z.string().min(1),
  details: z.record(z.unknown()).optional(),
});
export type StandardError = z.infer<typeof StandardErrorSchema>;

export const ErrorResponseSchema = z.object({
  error: StandardErrorSchema,
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// -----------------------------------------------------------------------------
// 2. CREATE TASK API CONTRACT
// -----------------------------------------------------------------------------
export const SupportedSourceAppSchema = z.enum([
  'education',
  'portfolio',
  'tax',
  'general',
  'huycncdsai',
  'gvcncdsai',
  'smarttax_ai',
  'control_center',
  'external_api',
]);
export type SupportedSourceApp = z.infer<typeof SupportedSourceAppSchema>;

export const SupportedTaskTypeSchema = z.enum([
  'lesson_plan',
  'tax_audit',
  'invoice_ocr',
  'slide_generation',
  'document_qa',
  'general_chat',
  'llm_inference',
  'rag_query',
  'workflow_automation',
  'model_training',
  'agent_execution',
]);
export type SupportedTaskType = z.infer<typeof SupportedTaskTypeSchema>;

export const CreateTaskRequestSchema = z.object({
  source_app: SupportedSourceAppSchema,
  task_type: SupportedTaskTypeSchema,
  input: z.record(z.unknown()).default({}),
  options: z
    .object({
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      model: z.string().optional(),
      timeout_seconds: z.number().int().positive().max(3600).default(300),
      idempotency_key: z.string().optional(),
    })
    .default({}),
});
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

export const CreateTaskResponseSchema = z.object({
  task_id: z.string().uuid(),
  status: TaskStatusSchema,
  request_id: z.string(),
  created_at: z.string().datetime().optional(),
});
export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;

// -----------------------------------------------------------------------------
// 3. TASK STATUS & OUTPUT RESPONSE CONTRACTS
// -----------------------------------------------------------------------------
export const TaskDetailResponseSchema = z.object({
  task_id: z.string().uuid(),
  source_app: z.string(),
  task_type: z.string(),
  status: TaskStatusSchema,
  created_at: z.string().datetime(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  claimed_by_worker_id: z.string().nullable().optional(),
  progress_pct: z.number().min(0).max(100).optional(),
});
export type TaskDetailResponse = z.infer<typeof TaskDetailResponseSchema>;

export const TaskCancelResponseSchema = z.object({
  task_id: z.string().uuid(),
  status: z.literal('cancelled'),
  cancelled_at: z.string().datetime(),
  message: z.string(),
});
export type TaskCancelResponse = z.infer<typeof TaskCancelResponseSchema>;

export const TaskOutputsResponseSchema = z.object({
  task_id: z.string().uuid(),
  status: TaskStatusSchema,
  output: z
    .object({
      text: z.string().optional(),
      json: z.unknown().optional(),
      model: z.string().optional(),
      tokens: z
        .object({
          prompt: z.number().optional(),
          completion: z.number().optional(),
          total: z.number().optional(),
        })
        .optional(),
      latency_ms: z.number().optional(),
      finish_reason: z.string().optional(),
    })
    .nullable(),
});
export type TaskOutputsResponse = z.infer<typeof TaskOutputsResponseSchema>;

// -----------------------------------------------------------------------------
// 4. TASK HISTORY QUERY CONTRACT
// -----------------------------------------------------------------------------
export const TaskHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: TaskStatusSchema.optional(),
  source_app: SupportedSourceAppSchema.optional(),
  task_type: SupportedTaskTypeSchema.optional(),
});
export type TaskHistoryQuery = z.infer<typeof TaskHistoryQuerySchema>;

export const TaskHistoryResponseSchema = z.object({
  tasks: z.array(TaskDetailResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
});
export type TaskHistoryResponse = z.infer<typeof TaskHistoryResponseSchema>;
