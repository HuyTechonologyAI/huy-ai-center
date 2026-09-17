import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AITaskSchema,
  TaskStatusSchema,
  CreateTaskInputSchema,
} from './task.js';

test('TaskStatusSchema validates allowed statuses', () => {
  assert.equal(TaskStatusSchema.parse('queued'), 'queued');
  assert.equal(TaskStatusSchema.parse('claimed'), 'claimed');
  assert.equal(TaskStatusSchema.parse('running'), 'running');
  assert.equal(TaskStatusSchema.parse('completed'), 'completed');
  assert.equal(TaskStatusSchema.parse('failed'), 'failed');
  assert.equal(TaskStatusSchema.parse('timeout'), 'timeout');
  assert.throws(() => TaskStatusSchema.parse('invalid_status'));
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
  assert.equal(parsed.timeoutSeconds, 300); // Default
});

test('AITaskSchema validates full task lifecycle object', () => {
  const now = new Date().toISOString();
  const task = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    sourceApp: 'huycncdsai',
    taskType: 'rag_query',
    priority: 'normal',
    status: 'queued',
    payload: {
      prompt: 'Search AI curriculum documents',
    },
    timeoutSeconds: 300,
    retryCount: 0,
    maxRetries: 3,
    createdAt: now,
    updatedAt: now,
  };

  const validated = AITaskSchema.parse(task);
  assert.equal(validated.id, task.id);
  assert.equal(validated.status, 'queued');
});
