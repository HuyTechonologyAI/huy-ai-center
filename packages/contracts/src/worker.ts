import { z } from 'zod';

export const WorkerStatusSchema = z.enum([
  'online',
  'offline',
  'busy',
  'draining',
  'error',
]);
export type WorkerStatus = z.infer<typeof WorkerStatusSchema>;

export const WorkerNodeSchema = z.object({
  nodeId: z.string().min(1),
  name: z.string().min(1),
  hostname: z.string().optional(),
  status: WorkerStatusSchema.default('offline'),
  capabilities: z.array(z.string()).default([]),
  maxConcurrency: z.number().int().positive().default(2),
  currentLoad: z.number().int().nonnegative().default(0),
  systemSpecs: z
    .object({
      ramTotalBytes: z.number().optional(),
      ramFreeBytes: z.number().optional(),
      cpuCores: z.number().optional(),
      cpuUsagePercent: z.number().optional(),
      gpuName: z.string().optional(),
      os: z.string().optional(),
    })
    .optional(),
  lastHeartbeatAt: z.string().datetime().optional(),
  registeredAt: z.string().datetime(),
});
export type WorkerNode = z.infer<typeof WorkerNodeSchema>;

export const WorkerHeartbeatSchema = z.object({
  nodeId: z.string().min(1),
  status: WorkerStatusSchema,
  currentLoad: z.number().int().nonnegative(),
  systemSpecs: WorkerNodeSchema.shape.systemSpecs.optional(),
  timestamp: z.string().datetime(),
});
export type WorkerHeartbeat = z.infer<typeof WorkerHeartbeatSchema>;
