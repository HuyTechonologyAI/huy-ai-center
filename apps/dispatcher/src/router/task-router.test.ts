import test from 'node:test';
import assert from 'node:assert';
import { rootLogger } from '@huy-ai/shared';
import { AIServiceAdapter, AITask } from '@huy-ai/contracts';
import { MockAdapter } from '../adapters/mock.adapter.js';
import { TaskRouter } from './task-router.js';

test('TaskRouter - routes to mock adapter when AI_PROVIDER_MODE=mock', async () => {
  const mockAdapter = new MockAdapter(rootLogger);
  const adapters = new Map<string, AIServiceAdapter>();
  adapters.set('mock', mockAdapter);

  const router = new TaskRouter(
    adapters,
    { providerMode: 'mock', fallbackToMockOnFailure: true },
    rootLogger
  );

  const dummyTask: AITask = {
    id: '11111111-1111-4111-8111-111111111111',
    sourceApp: 'control_center',
    taskType: 'llm_inference',
    priority: 'normal',
    status: 'running',
    payload: { parameters: { task_type: 'lesson_plan' } },
    steps: [],
    timeoutSeconds: 300,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const resolved = await router.resolveAdapter(dummyTask);
  assert.strictEqual(resolved.type, 'mock');
  assert.strictEqual(resolved.name, mockAdapter.name);
});

test('TaskRouter - falls back to mock when target provider is offline', async () => {
  const mockAdapter = new MockAdapter(rootLogger);
  const offlineAdapter: AIServiceAdapter = {
    type: 'langflow',
    name: 'Offline Langflow',
    isAvailable: async () => false,
    execute: async () => ({ error: 'Service Unavailable' }),
  };

  const adapters = new Map<string, AIServiceAdapter>();
  adapters.set('mock', mockAdapter);
  adapters.set('langflow', offlineAdapter);

  const router = new TaskRouter(
    adapters,
    { providerMode: 'langflow', fallbackToMockOnFailure: true },
    rootLogger
  );

  const dummyTask: AITask = {
    id: '22222222-2222-4222-8222-222222222222',
    sourceApp: 'control_center',
    taskType: 'rag_query',
    priority: 'normal',
    status: 'running',
    payload: { parameters: {} },
    steps: [],
    timeoutSeconds: 300,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const resolved = await router.resolveAdapter(dummyTask);
  assert.strictEqual(resolved.type, 'mock');
});
