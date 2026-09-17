import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TaskStatusSchema,
  CreateTaskInputSchema,
  AITaskSchema,
  AITaskStepSchema,
  AIOutputSchema,
  QueueMessageSchema,
  AgentSchema,
  ToolSchema,
  NodeSchema,
} from './index.js';

test('TaskStatusSchema validates all required statuses', () => {
  const validStatuses = [
    'queued',
    'claimed',
    'running',
    'waiting_approval',
    'completed',
    'failed',
    'cancelled',
  ];

  for (const status of validStatuses) {
    assert.equal(TaskStatusSchema.parse(status), status);
  }

  assert.throws(() => TaskStatusSchema.parse('invalid_status'));
});

test('AITaskStepSchema validates pipeline steps', () => {
  const step = {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    taskId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    stepNumber: 1,
    name: 'Retrieve Legal Documents',
    status: 'completed',
    input: { query: 'VAT regulations 2026' },
    output: { documentCount: 3 },
  };

  const validated = AITaskStepSchema.parse(step);
  assert.equal(validated.stepNumber, 1);
  assert.equal(validated.status, 'completed');
});

test('AIOutputSchema validates output formats', () => {
  const output = {
    text: 'Analysis complete',
    json: { score: 98 },
    model: 'qwen2.5:7b',
    tokens: { prompt: 120, completion: 45, total: 165 },
    latencyMs: 1450,
    finishReason: 'stop',
  };

  const validated = AIOutputSchema.parse(output);
  assert.equal(validated.text, 'Analysis complete');
  assert.equal(validated.tokens?.total, 165);
});

test('QueueMessageSchema validates async queue transport payload', () => {
  const msg = {
    messageId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    taskId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    sourceApp: 'smarttax_ai',
    taskType: 'llm_inference',
    priority: 'high',
    enqueuedAt: new Date().toISOString(),
    attempt: 1,
    payload: { prompt: 'Verify invoice tax code' },
  };

  const validated = QueueMessageSchema.parse(msg);
  assert.equal(validated.sourceApp, 'smarttax_ai');
  assert.equal(validated.priority, 'high');
});

test('Agent and Tool schemas validate correctly', () => {
  const tool = ToolSchema.parse({
    id: 'calc_vat',
    name: 'VAT Calculator',
    description: 'Calculate VAT deductions',
    type: 'function',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Pre-tax total' },
      },
      required: ['amount'],
    },
    enabled: true,
  });

  assert.equal(tool.name, 'VAT Calculator');

  const agent = AgentSchema.parse({
    id: 'tax_auditor_01',
    name: 'Tax Auditor Agent',
    role: 'tax_auditor',
    description: 'Audits business expenses',
    systemPrompt: 'You are an AI tax auditor.',
    model: 'qwen2.5:7b',
    tools: [tool.id],
  });

  assert.equal(agent.role, 'tax_auditor');
});

test('NodeSchema validates Dell M4800 on-prem node', () => {
  const node = NodeSchema.parse({
    id: 'huy-ai-node-01',
    name: 'Dell Precision M4800 Primary Node',
    hostname: 'huy-ai-node-01',
    status: 'online',
    capabilities: ['ollama', 'litellm', 'langflow', 'n8n'],
    maxConcurrency: 2,
    currentLoad: 1,
    systemSpecs: {
      ramTotalBytes: 34359738368,
      cpuCores: 8,
      os: 'Ubuntu Server 24.04 LTS',
    },
    registeredAt: new Date().toISOString(),
  });

  assert.equal(node.id, 'huy-ai-node-01');
  assert.equal(node.status, 'online');
  assert.equal(node.systemSpecs?.cpuCores, 8);
});

test('CreateTaskInputSchema validates valid input', () => {
  const input = {
    sourceApp: 'smarttax_ai',
    taskType: 'llm_inference',
    priority: 'high',
    payload: {
      prompt: 'Explain tax deduction rules',
      model: 'qwen2.5:7b',
    },
  };

  const parsed = CreateTaskInputSchema.parse(input);
  assert.equal(parsed.sourceApp, 'smarttax_ai');
  assert.equal(parsed.taskType, 'llm_inference');
  assert.equal(parsed.priority, 'high');
  assert.equal(parsed.payload.prompt, 'Explain tax deduction rules');
  assert.equal(parsed.timeoutSeconds, 300);
});

test('AITaskSchema validates full task lifecycle with steps and output', () => {
  const now = new Date().toISOString();
  const task = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    sourceApp: 'huycncdsai',
    taskType: 'rag_query',
    priority: 'normal',
    status: 'waiting_approval',
    payload: {
      prompt: 'Search AI curriculum documents',
    },
    steps: [],
    timeoutSeconds: 300,
    retryCount: 0,
    maxRetries: 3,
    createdAt: now,
    updatedAt: now,
  };

  const validated = AITaskSchema.parse(task);
  assert.equal(validated.id, task.id);
  assert.equal(validated.status, 'waiting_approval');
});
