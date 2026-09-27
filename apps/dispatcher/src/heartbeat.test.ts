import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNodeRegistrationRow,
  buildNodeHeartbeatRow,
  sanitizeOperationalMetadata,
} from './heartbeat.js';

test('node registration row matches current production nodes schema', () => {
  const row = buildNodeRegistrationRow({
    nodeId: 'huy-ai-node-01',
    nodeName: 'Dell Precision M4800 Primary AI Node',
    hostname: 'huy-ai-node-01',
    status: 'online',
    capabilities: ['planner', 'implementer'],
    maxConcurrency: 2,
    currentLoad: 1,
    specs: { os: 'Ubuntu Server 24.04 LTS', ram_gb: 32 },
    timestamp: '2026-09-27T06:00:00.000Z',
  });
  assert.equal(row.id, 'huy-ai-node-01');
  assert.deepEqual(row.specs, { os: 'Ubuntu Server 24.04 LTS', ram_gb: 32 });
  assert.equal('node_id' in row, false);
  assert.equal('system_specs' in row, false);
  assert.equal(row.current_load, 1);
});

test('heartbeat row matches current production node_heartbeats schema', () => {
  const row = buildNodeHeartbeatRow({
    nodeId: 'huy-ai-node-01',
    status: 'busy',
    cpuUsagePct: 24.5,
    ramUsagePct: 41.2,
    ramTotalMb: 32768,
    ramFreeMb: 19267,
    gpuUsagePct: 0,
    diskUsagePct: 3.5,
    queueDepth: 4,
    activeTasks: 2,
    metadata: { supervisorState: 'RUNNING' },
    timestamp: '2026-09-27T06:00:00.000Z',
  });
  assert.equal(row.node_id, 'huy-ai-node-01');
  assert.equal(row.queue_depth, 4);
  assert.equal(row.active_tasks, 2);
  assert.equal(row.created_at, '2026-09-27T06:00:00.000Z');
  for (const key of ['cpu_usage_pct', 'ram_usage_pct', 'disk_usage_pct', 'gpu_usage_pct'] as const) {
    assert.ok(Number.isFinite(row[key]));
    assert.ok(row[key] >= 0 && row[key] <= 100);
  }
  assert.equal('current_load' in row, false);
  assert.equal('system_specs' in row, false);
  assert.equal('recorded_at' in row, false);
});

test('heartbeat builder clamps unsafe numeric telemetry', () => {
  const row = buildNodeHeartbeatRow({
    nodeId: 'huy-ai-node-01', status: 'online',
    cpuUsagePct: 900, ramUsagePct: -2, ramTotalMb: 32768, ramFreeMb: 99999,
    gpuUsagePct: Number.NaN, diskUsagePct: 101, queueDepth: -4, activeTasks: -3,
    metadata: {}, timestamp: '2026-09-27T06:00:00.000Z',
  });
  assert.equal(row.cpu_usage_pct, 100);
  assert.equal(row.ram_usage_pct, 0);
  assert.equal(row.gpu_usage_pct, 0);
  assert.equal(row.disk_usage_pct, 100);
  assert.equal(row.queue_depth, 0);
  assert.equal(row.active_tasks, 0);
  assert.equal(row.ram_free_mb, 32768);
});

test('operational metadata is allowlisted and recursively strips sensitive fields', () => {
  const cleaned = sanitizeOperationalMetadata({
    supervisorState: 'DEGRADED',
    providerHealth: {
      codex: { available: true, token: 'secret-token' },
      antigravity: { authenticated: false, env: { HOME: '/home/huyadmin' } },
    },
    backlogTaskStatuses: { 'ai-workforce-plan': { status: 'BLOCKED', credential: 'bad' } },
    latestBottleneck: 'CODEX-USAGE-LIMIT.md',
    remoteSyncStatus: 'SYNC_PENDING',
    secret: 'remove-me',
    arbitrary: 'remove-me-too',
  });
  assert.deepEqual(Object.keys(cleaned).sort(), [
    'backlogTaskStatuses', 'latestBottleneck', 'providerHealth',
    'remoteSyncStatus', 'supervisorState',
  ]);
  const serialized = JSON.stringify(cleaned);
  assert.doesNotMatch(serialized, /secret-token|credential|"env"|remove-me/i);
  assert.match(serialized, /DEGRADED/);
});
