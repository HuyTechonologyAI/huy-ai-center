import { z } from 'zod';

// -----------------------------------------------------------------------------
// 1. TOOL CONTRACT
// -----------------------------------------------------------------------------
export const ToolTypeSchema = z.enum([
  'function',
  'api',
  'retriever',
  'bash',
  'python',
  'custom',
]);
export type ToolType = z.infer<typeof ToolTypeSchema>;

export const ToolParameterPropertySchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

export const ToolParametersSchema = z.object({
  type: z.literal('object').default('object'),
  properties: z.record(ToolParameterPropertySchema),
  required: z.array(z.string()).default([]),
});
export type ToolParameters = z.infer<typeof ToolParametersSchema>;

export const ToolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: ToolTypeSchema.default('function'),
  parameters: ToolParametersSchema,
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});
export type Tool = z.infer<typeof ToolSchema>;

// -----------------------------------------------------------------------------
// 2. AGENT CONTRACT
// -----------------------------------------------------------------------------
export const AgentRoleSchema = z.enum([
  'orchestrator',
  'rag_specialist',
  'code_generator',
  'tax_auditor',
  'teacher_assistant',
  'data_analyst',
  'custom',
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: AgentRoleSchema,
  description: z.string(),
  systemPrompt: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  tools: z.array(z.string()).default([]), // Tool IDs
  maxIterations: z.number().int().positive().default(10),
  active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});
export type Agent = z.infer<typeof AgentSchema>;
