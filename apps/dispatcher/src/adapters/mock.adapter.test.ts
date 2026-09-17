import test from 'node:test';
import assert from 'node:assert';
import { rootLogger } from '@huy-ai/shared';
import { MockAdapter } from './mock.adapter.js';

test('MockAdapter - isAvailable returns true', async () => {
  const adapter = new MockAdapter(rootLogger);
  const available = await adapter.isAvailable();
  assert.strictEqual(available, true);
  assert.strictEqual(adapter.type, 'mock');
});

test('MockAdapter - generates lesson plan (CV 5512)', async () => {
  const adapter = new MockAdapter(rootLogger);
  const result = await adapter.execute({
    parameters: { task_type: 'lesson_plan', source_app: 'education' },
    inputs: {
      subject: 'Tin học',
      grade: 'Lớp 8',
      topic: 'Mạng máy tính',
      periods: 2,
    },
  });

  assert.ok(result.text, 'Should have text content');
  assert.ok(result.text.includes('CÔNG VĂN 5512'), 'Should format per CV 5512');
  assert.ok(result.output, 'Should have structured output');
  assert.ok(result.tokens && result.tokens.total! > 0, 'Should record token usage');
  assert.ok(typeof result.latencyMs === 'number', 'Should record latency');
  assert.strictEqual(result.finishReason, 'stop');
});

test('MockAdapter - generates presentation slides', async () => {
  const adapter = new MockAdapter(rootLogger);
  const result = await adapter.execute({
    parameters: { task_type: 'presentation_slides' },
    inputs: { topic: 'Internet Toàn Cầu' },
  });

  assert.ok(result.output, 'Should have structured output');
  const output = result.output as { format: string; totalSlides: number };
  assert.strictEqual(output.format, 'presentation_slides');
  assert.ok(output.totalSlides > 0);
});

test('MockAdapter - generates quiz questions bank', async () => {
  const adapter = new MockAdapter(rootLogger);
  const result = await adapter.execute({
    parameters: { task_type: 'quiz_generator' },
    inputs: { topic: 'Mạng máy tính' },
  });

  assert.ok(result.output, 'Should have structured output');
  const output = result.output as { format: string; totalQuestions: number };
  assert.strictEqual(output.format, 'quiz_bank');
  assert.ok(output.totalQuestions > 0);
});
