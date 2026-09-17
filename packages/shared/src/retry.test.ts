import test from 'node:test';
import assert from 'node:assert/strict';
import { withRetry } from './retry.js';

test('withRetry succeeds immediately on successful call', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    return 'ok';
  });

  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('withRetry succeeds after transient failures', async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) {
        throw new Error('transient network glitch');
      }
      return 'recovered';
    },
    { initialDelayMs: 10, maxRetries: 3 }
  );

  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
});

test('withRetry fails after exceeding maxRetries', async () => {
  let calls = 0;
  await assert.rejects(
    async () => {
      await withRetry(
        async () => {
          calls++;
          throw new Error('fatal error');
        },
        { initialDelayMs: 10, maxRetries: 2 }
      );
    },
    { message: 'fatal error' }
  );

  assert.equal(calls, 3); // initial + 2 retries
});
