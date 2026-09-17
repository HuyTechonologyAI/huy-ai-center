import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateTaskRequestSchema,
  StandardErrorSchema,
  CreateTaskResponseSchema,
  TaskOutputsResponseSchema,
} from '@huy-ai/contracts';
import { checkIdempotency, saveIdempotency } from '../apps/control-center/src/lib/api-response.js';

// ==============================================================================
// MOCK WORKER DAEMON (Simulates background task processing without real Dell)
// ==============================================================================
class MockWorker {
  private activeJobs = new Map<string, { status: string; result?: unknown }>();

  enqueue(taskId: string): void {
    this.activeJobs.set(taskId, { status: 'queued' });
  }

  claim(taskId: string): boolean {
    const job = this.activeJobs.get(taskId);
    if (!job || job.status !== 'queued') return false;
    job.status = 'claimed';
    return true;
  }

  execute(taskId: string, result: unknown): void {
    const job = this.activeJobs.get(taskId);
    if (!job) return;
    job.status = 'completed';
    job.result = result;
  }

  cancel(taskId: string): boolean {
    const job = this.activeJobs.get(taskId);
    if (!job || job.status === 'completed') return false;
    job.status = 'cancelled';
    return true;
  }

  getStatus(taskId: string): string | undefined {
    return this.activeJobs.get(taskId)?.status;
  }

  getResult(taskId: string): unknown {
    return this.activeJobs.get(taskId)?.result;
  }
}

// ==============================================================================
// SUITE: AI TASK API CONTRACT & MOCK WORKER LIFECYCLE
// ==============================================================================

test('Task API Input Validation accepts standard ecosystem payloads', () => {
  const lessonPlanTask = {
    source_app: 'education',
    task_type: 'lesson_plan',
    input: { grade: 12, subject: 'Vật Lý', topic: 'Dao động điều hòa' },
    options: { priority: 'high', timeout_seconds: 180 },
  };

  const parsed = CreateTaskRequestSchema.parse(lessonPlanTask);
  assert.equal(parsed.source_app, 'education');
  assert.equal(parsed.task_type, 'lesson_plan');
});

test('Task API Input Validation rejects malicious / unmapped task types', () => {
  const badTask = {
    source_app: 'education',
    task_type: 'drop_database_now',
    input: {},
  };

  assert.throws(() => CreateTaskRequestSchema.parse(badTask));
});

test('Idempotency mechanism prevents duplicate job creation on browser retry', () => {
  const idempotencyKey = `test_idem_${Date.now()}`;
  const taskId = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';

  // 1. Initial submission
  assert.equal(checkIdempotency(idempotencyKey), null);
  saveIdempotency(idempotencyKey, taskId, 'queued');

  // 2. Browser retry with identical key
  const replay = checkIdempotency(idempotencyKey);
  assert.notEqual(replay, null);
  assert.equal(replay?.taskId, taskId);
  assert.equal(replay?.status, 'queued');
});

test('Mock Worker completes full task lifecycle: queued -> claimed -> completed', () => {
  const worker = new MockWorker();
  const taskId = 'task_mock_123';

  // Enqueue
  worker.enqueue(taskId);
  assert.equal(worker.getStatus(taskId), 'queued');

  // Claim
  const claimed = worker.claim(taskId);
  assert.equal(claimed, true);
  assert.equal(worker.getStatus(taskId), 'claimed');

  // Execute
  const mockOutput = {
    text: 'Kế hoạch bài dạy chi tiết môn Vật Lý...',
    model: 'qwen2.5:7b-mock',
    tokens: { total: 350 },
    latency_ms: 480,
  };
  worker.execute(taskId, mockOutput);
  assert.equal(worker.getStatus(taskId), 'completed');

  // Validate output contract
  const validatedOutput = TaskOutputsResponseSchema.parse({
    task_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    status: 'completed',
    output: mockOutput,
  });
  assert.equal(validatedOutput.status, 'completed');
  assert.equal(validatedOutput.output?.tokens?.total, 350);
});

test('Mock Worker handles task cancellation properly', () => {
  const worker = new MockWorker();
  const taskId = 'task_cancel_test';

  worker.enqueue(taskId);
  assert.equal(worker.getStatus(taskId), 'queued');

  const cancelled = worker.cancel(taskId);
  assert.equal(cancelled, true);
  assert.equal(worker.getStatus(taskId), 'cancelled');

  // Cannot cancel already completed task
  const completedTask = 'task_completed_test';
  worker.enqueue(completedTask);
  worker.claim(completedTask);
  worker.execute(completedTask, { done: true });
  assert.equal(worker.cancel(completedTask), false);
});

test('Standard Error Model formats standardized HTTP error responses', () => {
  const errorObj = {
    code: 'UNAUTHORIZED',
    message: 'Missing or invalid authentication token',
    retryable: false,
    request_id: 'req_test_123',
    details: { reason: 'Expired token' },
  };

  const parsed = StandardErrorSchema.parse(errorObj);
  assert.equal(parsed.code, 'UNAUTHORIZED');
  assert.equal(parsed.retryable, false);
});
