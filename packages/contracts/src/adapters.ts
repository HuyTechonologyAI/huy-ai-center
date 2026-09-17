import { z } from 'zod';
import { TaskPayload, TaskResult } from './task.js';

export const AdapterTypeSchema = z.enum([
  'ollama',
  'litellm',
  'langflow',
  'n8n',
  'echo',
]);
export type AdapterType = z.infer<typeof AdapterTypeSchema>;

export interface AIServiceAdapter {
  readonly type: AdapterType;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  execute(payload: TaskPayload): Promise<TaskResult>;
}

export const AdapterHealthSchema = z.object({
  adapterType: AdapterTypeSchema,
  isHealthy: z.boolean(),
  latencyMs: z.number().optional(),
  details: z.record(z.unknown()).optional(),
  checkedAt: z.string().datetime(),
});
export type AdapterHealth = z.infer<typeof AdapterHealthSchema>;
