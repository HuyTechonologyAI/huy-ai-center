import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelemetryOnly, resolveHealthBindHost, shouldStartTaskPoller } from './runtime-mode.js';

test('telemetry-only mode disables queue polling', () => {
  assert.equal(shouldStartTaskPoller(true), false);
  assert.equal(shouldStartTaskPoller(false), true);
});

test('telemetry-only parser handles true and false strictly', () => {
  assert.equal(parseTelemetryOnly('true'), true);
  assert.equal(parseTelemetryOnly('TRUE'), true);
  assert.equal(parseTelemetryOnly('false'), false);
  assert.equal(parseTelemetryOnly(undefined), false);
});

test('telemetry-only parser rejects ambiguous values', () => {
  assert.throws(() => parseTelemetryOnly('yes'), /true or false/);
});

test('telemetry-only health endpoint binds loopback while normal mode keeps all-interface behavior', () => {
  assert.equal(resolveHealthBindHost(true), '127.0.0.1');
  assert.equal(resolveHealthBindHost(false), '0.0.0.0');
});
