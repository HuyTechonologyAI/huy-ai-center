import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateTaskRequestSchema,
  CreateTaskResponseSchema,
  StandardErrorSchema,
  TaskOutputsResponseSchema,
  TaskHistoryQuerySchema,
} from './index.js';

test('CreateTaskRequestSchema validates standard lesson_plan task input', () => {
  const req = {
    source_app: 'education',
    task_type: 'lesson_plan',
    input: {
      subject: 'Toán học',
      grade: 10,
      topic: 'Hàm số bậc hai',
    },
    options: {
      priority: 'high',
      timeout_seconds: 300,
      idempotency_key: 'idem_lesson_12345',
    },
  };

  const parsed = CreateTaskRequestSchema.parse(req);
  assert.equal(parsed.source_app, 'education');
  assert.equal(parsed.task_type, 'lesson_plan');
  assert.equal(parsed.options?.idempotency_key, 'idem_lesson_12345');
  assert.equal(parsed.options?.priority, 'high');
});

test('CreateTaskRequestSchema rejects unsupported task types', () => {
  const invalidReq = {
    source_app: 'education',
    task_type: 'unsupported_magic_ai_action',
    input: {},
  };

  assert.throws(() => CreateTaskRequestSchema.parse(invalidReq));
});

test('CreateTaskResponseSchema validates task_id and queued status', () => {
  const res = {
    task_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    status: 'queued',
    request_id: 'req_test_999',
  };

  const parsed = CreateTaskResponseSchema.parse(res);
  assert.equal(parsed.status, 'queued');
  assert.equal(parsed.task_id, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
});

test('StandardErrorSchema validates error model properties', () => {
  const err = {
    code: 'INSUFFICIENT_CREDITS',
    message: 'Your organization has depleted its AI token balance',
    retryable: false,
    request_id: 'req_err_888',
    details: { required_credits: 50, current_balance: 10 },
  };

  const parsed = StandardErrorSchema.parse(err);
  assert.equal(parsed.code, 'INSUFFICIENT_CREDITS');
  assert.equal(parsed.retryable, false);
});

test('TaskOutputsResponseSchema validates completed task output', () => {
  const outputRes = {
    task_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    status: 'completed',
    output: {
      text: 'Detailed lesson plan content...',
      json: { durationMinutes: 45 },
      model: 'qwen2.5:7b',
      tokens: { total: 420 },
      latency_ms: 1200,
    },
  };

  const parsed = TaskOutputsResponseSchema.parse(outputRes);
  assert.equal(parsed.status, 'completed');
  assert.equal(parsed.output?.model, 'qwen2.5:7b');
});

test('TaskHistoryQuerySchema sets default pagination', () => {
  const query = TaskHistoryQuerySchema.parse({});
  assert.equal(query.page, 1);
  assert.equal(query.limit, 20);
});
