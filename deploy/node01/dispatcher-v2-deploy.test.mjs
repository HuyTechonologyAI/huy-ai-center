import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { createDispatcherV2Server } from './dispatcher-v2-runtime.mjs';

test('Dispatcher V2 runtime stays loopback-only with production queue gate closed', async () => {
  const server = createDispatcherV2Server({ host: '127.0.0.1', port: 0, queueGate: 'CLOSED_07C' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.equal(typeof address, 'object');
  const base = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${base}/health`).then(r => r.json());
  assert.equal(health.status, 'ok');
  assert.equal(health.dispatcherV2Loaded, true);
  assert.equal(health.queueGate, 'CLOSED_07C');

  const ready = await fetch(`${base}/ready`);
  assert.equal(ready.status, 200);

  const selftest = await fetch(`${base}/selftest`).then(r => r.json());
  assert.equal(selftest.coreDecision?.allowed, false);
  assert.equal(selftest.coreDecision?.reason, 'NO_ELIGIBLE_AGENT');

  const dispatch = await fetch(`${base}/dispatch`, { method: 'POST', body: '{}' });
  assert.equal(dispatch.status, 503);
  const denied = await dispatch.json();
  assert.equal(denied.error, 'QUEUE_GATE_CLOSED_07C');

  await new Promise(resolve => server.close(resolve));
});

test('systemd unit is hardened and deploy/rollback scripts are bounded', async () => {
  const unit = await readFile(new URL('./huy-ai-dispatcher-v2.service', import.meta.url), 'utf8');
  assert.match(unit, /Environment=DISPATCHER_V2_HOST=127\.0\.0\.1/);
  assert.match(unit, /Environment=DISPATCHER_V2_QUEUE_GATE=CLOSED_07C/);
  assert.match(unit, /NoNewPrivileges=true/);
  assert.match(unit, /PrivateTmp=true/);
  assert.match(unit, /Restart=always/);
  assert.doesNotMatch(unit, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(unit, /0\.0\.0\.0/);

  const deploy = await readFile(new URL('./deploy-dispatcher-v2.sh', import.meta.url), 'utf8');
  const rollback = await readFile(new URL('./rollback-dispatcher-v2.sh', import.meta.url), 'utf8');
  assert.match(deploy, /systemctl --user/);
  assert.match(deploy, /\/health/);
  assert.match(deploy, /selftest/);
  assert.match(rollback, /systemctl --user/);
  assert.doesNotMatch(deploy + rollback, /sudo|rm -rf|--force/);
});
