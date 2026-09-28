import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDispatcherV2Server } from '../deploy/node01/dispatcher-v2-runtime.mjs';

async function withServer(options, fn) {
  const server = createDispatcherV2Server(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.equal(typeof address, 'object');
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('07C queue transport stays closed unless the approved gate is OPEN_07C', async () => {
  await withServer({ queueGate: 'CLOSED_07C' }, async base => {
    const response = await fetch(`${base}/queue/once`, { method: 'POST' });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'QUEUE_GATE_CLOSED_07C' });
  });
});

test('07C queue transport polls, dispatches fail-closed, and finalizes one canary', async () => {
  const calls = [];
  let executeCalled = false;

  const gatewayCall = async (operation, body) => {
    calls.push({ operation, body });
    if (operation === 'poll_claim') {
      return {
        job: {
          msgId: 77,
          taskId: '11111111-1111-4111-8111-111111111111',
          request: {
            organization_id: 'org-01-huytech',
            capabilities: ['e2e-smoke'],
            risk_level: 0,
            data_classification: 'PUBLIC',
            payload: { canary: true }
          },
          context: {
            organization_id: 'org-01-huytech',
            risk_ceiling: 0,
            data_classification_ceiling: 'RESTRICTED',
            agents: []
          }
        }
      };
    }
    if (operation === 'finalize_canary') {
      assert.equal(body.taskId, '11111111-1111-4111-8111-111111111111');
      assert.equal(body.msgId, 77);
      assert.equal(body.decisionReason, 'NO_ELIGIBLE_AGENT');
      return { finalized: true, archived: true };
    }
    throw new Error(`unexpected operation: ${operation}`);
  };

  await withServer({
    queueGate: 'OPEN_07C',
    gatewayCall,
    executeOverride: async () => {
      executeCalled = true;
      throw new Error('CANARY_EXECUTION_MUST_NOT_RUN');
    }
  }, async base => {
    const response = await fetch(`${base}/queue/once`, { method: 'POST' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'CANARY_PROCESSED');
    assert.deepEqual(body.decision, { allowed: false, reason: 'NO_ELIGIBLE_AGENT' });
    assert.equal(body.taskId, '11111111-1111-4111-8111-111111111111');
    assert.equal(body.msgId, 77);
  });

  assert.equal(executeCalled, false);
  assert.deepEqual(calls.map(x => x.operation), ['poll_claim', 'finalize_canary']);
});
