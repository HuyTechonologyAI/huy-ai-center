import { z } from 'zod';

export const WorkerEnvSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, 'SUPABASE_SERVICE_ROLE_KEY is required for worker'),
  WORKER_NODE_ID: z.string().default('huy-ai-node-01'),
  WORKER_NODE_NAME: z.string().default('Dell Precision M4800 Primary Node'),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().positive().default(3000),
  WORKER_HEARTBEAT_INTERVAL_MS: z.coerce.number().positive().default(10000),
  WORKER_CONCURRENCY: z.coerce.number().positive().default(2),
  WORKER_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DISPATCHER_HEALTH_PORT: z.coerce.number().default(8080),

  // Optional AI backends
  OLLAMA_BASE_URL: z.string().url().default('http://127.0.0.1:11434'),
  LITELLM_BASE_URL: z.string().url().default('http://127.0.0.1:4000'),
  LITELLM_API_KEY: z.string().optional(),
  LANGFLOW_BASE_URL: z.string().url().default('http://127.0.0.1:7860'),
  LANGFLOW_API_KEY: z.string().optional(),
  N8N_BASE_URL: z.string().url().default('http://127.0.0.1:5678'),
  N8N_API_KEY: z.string().optional(),
});
export type WorkerEnv = z.infer<typeof WorkerEnvSchema>;

export const ControlCenterEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),
  PORT: z.coerce.number().default(3000),
});
export type ControlCenterEnv = z.infer<typeof ControlCenterEnvSchema>;

export function parseWorkerEnv(env: Record<string, string | undefined>): WorkerEnv {
  return WorkerEnvSchema.parse(env);
}

export function parseControlCenterEnv(env: Record<string, string | undefined>): ControlCenterEnv {
  return ControlCenterEnvSchema.parse(env);
}
