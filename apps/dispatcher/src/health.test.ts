import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthServer } from './health.js';
import { Logger } from '@huy-ai/shared';

test('HealthServer responds 200 on /health', async () => {
  const logger = new Logger('TestHealth', 'error');
  const server = new HealthServer(
    {
      port: 8999,
      workerId: 'test-node-01',
      getActiveJobs: () => 0,
      isReady: () => true,
    },
    logger
  );

  await server.start();

  try {
    const res = await fetch('http://127.0.0.1:8999/health');
    assert.equal(res.status, 200);

    const json = (await res.json()) as { status: string; workerId: string };
    assert.equal(json.status, 'ok');
    assert.equal(json.workerId, 'test-node-01');

    const readyRes = await fetch('http://127.0.0.1:8999/ready');
    assert.equal(readyRes.status, 200);
    const readyJson = (await readyRes.json()) as { ready: boolean; activeJobs: number };
    assert.equal(readyJson.ready, true);
    assert.equal(readyJson.activeJobs, 0);
  } finally {
    await server.stop();
  }
});
