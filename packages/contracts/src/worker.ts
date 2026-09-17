import { z } from 'zod';

export const NodeStatusSchema = z.enum([
  'online',
  'offline',
  'busy',
  'draining',
  'error',
]);
export type NodeStatus = z.infer<typeof NodeStatusSchema>;

export const WorkerStatusSchema = NodeStatusSchema;
export type WorkerStatus = NodeStatus;

export const SystemSpecsSchema = z.object({
  ramTotalBytes: z.number().optional(),
  ramFreeBytes: z.number().optional(),
  cpuCores: z.number().optional(),
  cpuUsagePercent: z.number().optional(),
  gpuName: z.string().optional(),
  storageTotalBytes: z.number().optional(),
  storageFreeBytes: z.number().optional(),
  os: z.string().optional(),
});
export type SystemSpecs = z.infer<typeof SystemSpecsSchema>;

export const NodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hostname: z.string().optional(),
  ipAddress: z.string().optional(),
  status: NodeStatusSchema.default('offline'),
  capabilities: z.array(z.string()).default([]),
  maxConcurrency: z.number().int().positive().default(2),
  currentLoad: z.number().int().nonnegative().default(0),
  systemSpecs: SystemSpecsSchema.optional(),
  lastHeartbeatAt: z.string().datetime().optional(),
  registeredAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});
export type Node = z.infer<typeof NodeSchema>;

// Alias for WorkerNode
export const WorkerNodeSchema = NodeSchema;
export type WorkerNode = Node;

export const WorkerHeartbeatSchema = z.object({
  nodeId: z.string().min(1),
  status: NodeStatusSchema,
  currentLoad: z.number().int().nonnegative(),
  systemSpecs: SystemSpecsSchema.optional(),
  timestamp: z.string().datetime(),
});
export type WorkerHeartbeat = z.infer<typeof WorkerHeartbeatSchema>;
