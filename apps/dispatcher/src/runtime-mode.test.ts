import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelemetryOnly, shouldStartTaskPoller } from './runtime-mode.js';

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
