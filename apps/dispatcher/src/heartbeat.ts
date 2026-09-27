import os from 'node:os';
import { basename, join } from 'node:path';
import { existsSync, readFileSync, readdirSync, statfsSync, statSync } from 'node:fs';
import { SupabaseClient } from '@supabase/supabase-js';
import { WorkerStatus } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';

export interface HeartbeatManagerConfig {
  nodeId: string;
  nodeName: string;
  intervalMs: number;
  capabilities: string[];
  maxConcurrency?: number;
  metadataProvider?: () => unknown;
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type OperationalMetadata = Record<string, JsonValue>;

const ALLOWED_METADATA_KEYS = new Set([
  'supervisorState',
  'providerHealth',
  'backlogTaskStatuses',
  'latestBottleneck',
  'remoteSyncStatus',
]);
const SENSITIVE_KEY = /secret|token|credential|password|env|api[_-]?key/i;

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function clamp(value: unknown, min: number, max: number): number {
  return Math.min(max, Math.max(min, finite(value)));
}
function nonNegativeInt(value: unknown): number {
  return Math.max(0, Math.floor(finite(value)));
}
function safeJsonValue(value: unknown, depth = 0): JsonValue | undefined {
  if (depth > 6) return undefined;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (Array.isArray(value)) {
    return value.map(item => safeJsonValue(item, depth + 1)).filter((item): item is JsonValue => item !== undefined);
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return undefined;
  const output: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    const cleaned = safeJsonValue(child, depth + 1);
    if (cleaned !== undefined) output[key] = cleaned;
  }
  return output;
}

export function sanitizeOperationalMetadata(value: unknown): OperationalMetadata {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return {};
  const output: OperationalMetadata = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (!ALLOWED_METADATA_KEYS.has(key) || SENSITIVE_KEY.test(key)) continue;
    const cleaned = safeJsonValue(child);
    if (cleaned !== undefined) output[key] = cleaned;
  }
  return output;
}

export function buildNodeRegistrationRow(input: {
  nodeId: string;
  nodeName: string;
  hostname: string;
  status: WorkerStatus;
  capabilities: string[];
  maxConcurrency: number;
  currentLoad: number;
  specs: Record<string, unknown>;
  timestamp: string;
}) {
  return {
    id: input.nodeId,
    name: input.nodeName,
    hostname: input.hostname,
    status: input.status,
    capabilities: input.capabilities,
    specs: input.specs,
    max_concurrency: Math.max(1, Math.floor(finite(input.maxConcurrency, 1))),
    current_load: nonNegativeInt(input.currentLoad),
    last_heartbeat_at: input.timestamp,
    updated_at: input.timestamp,
  };
}

export function buildNodeHeartbeatRow(input: {
  nodeId: string;
  status: WorkerStatus;
  cpuUsagePct: number;
  ramUsagePct: number;
  ramTotalMb: number;
  ramFreeMb: number;
  gpuUsagePct: number;
  diskUsagePct: number;
  queueDepth: number;
  activeTasks: number;
  metadata: unknown;
  timestamp: string;
}) {
  const ramTotalMb = nonNegativeInt(input.ramTotalMb);
  return {
    node_id: input.nodeId,
    cpu_usage_pct: clamp(input.cpuUsagePct, 0, 100),
    ram_usage_pct: clamp(input.ramUsagePct, 0, 100),
    ram_total_mb: ramTotalMb,
    ram_free_mb: Math.min(ramTotalMb, nonNegativeInt(input.ramFreeMb)),
    gpu_usage_pct: clamp(input.gpuUsagePct, 0, 100),
    disk_usage_pct: clamp(input.diskUsagePct, 0, 100),
    queue_depth: nonNegativeInt(input.queueDepth),
    active_tasks: nonNegativeInt(input.activeTasks),
    status: input.status,
    metadata: sanitizeOperationalMetadata(input.metadata),
    created_at: input.timestamp,
  };
}

function readJsonFile(path: string): Record<string, unknown> | undefined {
  try {
    if (!existsSync(path)) return undefined;
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    return parsed && typeof parsed === 'object' && Object.getPrototypeOf(parsed) === Object.prototype
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function latestBottleneckName(dir: string): string {
  try {
    if (!existsSync(dir)) return 'NONE';
    const candidates = readdirSync(dir)
      .filter(name => name.endsWith('.md'))
      .map(name => ({ name, mtime: statSync(join(dir, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    return candidates[0] ? basename(candidates[0].name) : 'NONE';
  } catch {
    return 'UNKNOWN';
  }
}

export function collectNode01OperationalMetadata(): OperationalMetadata {
  const supervisor = readJsonFile('/mnt/data1/HUY-AI/state/supervisors/persistent-multi-ai-state.json');
  const backlog = readJsonFile('/mnt/data1/HUY-AI/runtime/autonomy-control/.artifacts/agent-bridge/backlog-state.json');
  return sanitizeOperationalMetadata({
    supervisorState: typeof supervisor?.state === 'string' ? supervisor.state : 'UNKNOWN',
    providerHealth: supervisor?.providers ?? {},
    backlogTaskStatuses: backlog?.tasks ?? {},
    latestBottleneck: latestBottleneckName('/mnt/data1/HUY-AI/state/bottlenecks'),
    remoteSyncStatus: typeof supervisor?.remoteSyncStatus === 'string' ? supervisor.remoteSyncStatus : 'UNKNOWN',
  });
}

function diskUsagePct(path = '/mnt/data1'): number {
  try {
    const fs = statfsSync(path);
    const total = finite(fs.blocks) * finite(fs.bsize);
    const free = finite(fs.bfree) * finite(fs.bsize);
    if (total <= 0) return 0;
    return clamp(((total - free) / total) * 100, 0, 100);
  } catch {
    return 0;
  }
}

function cpuUsagePct(): number {
  const cores = Math.max(1, os.cpus().length);
  return clamp((os.loadavg()[0] / cores) * 100, 0, 100);
}

export class HeartbeatManager {
  private supabase: SupabaseClient;
  private config: HeartbeatManagerConfig;
  private logger: Logger;
  private timer: NodeJS.Timeout | null = null;
  private currentStatus: WorkerStatus = 'online';
  private currentLoad = 0;

  constructor(supabase: SupabaseClient, config: HeartbeatManagerConfig, logger: Logger) {
    this.supabase = supabase;
    this.config = config;
    this.logger = logger.child('Heartbeat');
  }

  setLoad(load: number): void {
    this.currentLoad = Math.max(0, load);
    this.currentStatus = this.currentLoad > 0 ? 'busy' : 'online';
  }

  setStatus(status: WorkerStatus): void {
    this.currentStatus = status;
  }

  async register(): Promise<void> {
    const now = new Date().toISOString();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const row = buildNodeRegistrationRow({
      nodeId: this.config.nodeId,
      nodeName: this.config.nodeName,
      hostname: os.hostname(),
      status: this.currentStatus,
      capabilities: this.config.capabilities,
      maxConcurrency: this.config.maxConcurrency || 2,
      currentLoad: this.currentLoad,
      specs: {
        ram_total_mb: Math.round(totalMem / 1024 / 1024),
        ram_free_mb: Math.round(freeMem / 1024 / 1024),
        cpu_cores: os.cpus().length,
        os: `${os.type()} ${os.release()} (${os.arch()})`,
      },
      timestamp: now,
    });

    const { error } = await this.supabase.from('nodes').upsert(row, { onConflict: 'id' });
    if (error) this.logger.warn('Could not register node', { error: error.message });
    else this.logger.info('Node registered successfully in nodes table.');
  }

  start(): void {
    this.timer = setInterval(() => {
      this.sendHeartbeat().catch(err => this.logger.warn('Heartbeat tick failed', { error: String(err) }));
    }, this.config.intervalMs);
  }

  async sendHeartbeat(): Promise<void> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const totalMb = Math.round(totalMem / 1024 / 1024);
    const freeMb = Math.round(freeMem / 1024 / 1024);
    const now = new Date().toISOString();
    let queueDepth = 0;

    try {
      const { count, error } = await this.supabase
        .from('ai_tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['PENDING', 'READY', 'QUEUED']);
      if (!error) queueDepth = count ?? 0;
    } catch {
      // Queue telemetry is best-effort and must never interrupt heartbeat.
    }

    const metadata = this.config.metadataProvider?.() ?? collectNode01OperationalMetadata();
    const heartbeatRow = buildNodeHeartbeatRow({
      nodeId: this.config.nodeId,
      status: this.currentStatus,
      cpuUsagePct: cpuUsagePct(),
      ramUsagePct: totalMem > 0 ? ((totalMem - freeMem) / totalMem) * 100 : 0,
      ramTotalMb: totalMb,
      ramFreeMb: freeMb,
      gpuUsagePct: 0,
      diskUsagePct: diskUsagePct(),
      queueDepth,
      activeTasks: this.currentLoad,
      metadata,
      timestamp: now,
    });

    try {
      const { error: nodeErr } = await this.supabase.from('nodes').update({
        status: this.currentStatus,
        current_load: nonNegativeInt(this.currentLoad),
        specs: {
          ram_total_mb: totalMb,
          ram_free_mb: freeMb,
          cpu_cores: os.cpus().length,
          os: `${os.type()} ${os.release()} (${os.arch()})`,
        },
        last_heartbeat_at: now,
        updated_at: now,
      }).eq('id', this.config.nodeId);
      if (nodeErr) this.logger.debug('Update nodes heartbeat notice', { message: nodeErr.message });
    } catch {
      // Database telemetry failure must not stop dispatcher execution.
    }

    try {
      const { error } = await this.supabase.from('node_heartbeats').insert(heartbeatRow);
      if (error) this.logger.debug('Insert node heartbeat notice', { message: error.message });
    } catch {
      // Database telemetry failure must not stop dispatcher execution.
    }

    this.logger.debug('Heartbeat emitted', {
      nodeId: this.config.nodeId,
      load: this.currentLoad,
      queueDepth,
      status: this.currentStatus,
    });
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    try {
      await this.supabase.from('nodes').update({
        status: 'offline',
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', this.config.nodeId);
      this.logger.info('Marked node status offline on shutdown.');
    } catch (err) {
      this.logger.warn('Failed to mark offline on shutdown', { error: String(err) });
    }
  }
}
