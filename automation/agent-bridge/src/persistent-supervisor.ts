import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runBacklog } from './backlog-runner.js';
import {
  ALL_PROVIDER_IDS,
  createProviderHealth,
  probeProviders,
  type ProviderHealth,
  type ProviderId
} from './provider-mesh.js';

export interface BacklogCycleResult {
  status: string;
  taskId?: string;
  reason?: string;
}

export type SupervisorState =
  | 'BOOTING'
  | 'RUNNING'
  | 'IDLE'
  | 'WAITING_PROVIDER'
  | 'WAITING_HUMAN'
  | 'DEGRADED'
  | 'STOPPED';

export interface SupervisorDecision {
  state: SupervisorState;
  delayMs: number;
  reason: string;
  notifyHuman: boolean;
}

export interface SupervisorOptions {
  stateDir?: string;
  idleMs?: number;
  blockedMs?: number;
  providerProbeMs?: number;
  once?: boolean;
  maxTicks?: number;
}

const RECOVERABLE_PROVIDER_MARKERS = [
  'CODEX_UNAVAILABLE',
  'ANTIGRAVITY_UNAVAILABLE',
  'CLAUDE_UNAVAILABLE',
  'GEMINI_UNAVAILABLE',
  'CHATGPT_UNAVAILABLE',
  'TOOL_CAPACITY_WAIT',
  'EXECUTION_TIMEOUT',
  'temporary capacity',
  'rate limit',
  '429'
];

export function decideSupervisorNextAction(
  result: BacklogCycleResult,
  options: { idleMs: number; blockedMs: number }
): SupervisorDecision {
  switch (result.status) {
    case 'COMPLETED':
      return {
        state: 'RUNNING',
        delayMs: 0,
        reason: 'NEXT_DAG_NODE',
        notifyHuman: false
      };

    case 'HUMAN_GATE':
      return {
        state: 'WAITING_HUMAN',
        delayMs: options.blockedMs,
        reason: result.reason || 'HUMAN_GATE',
        notifyHuman: true
      };

    case 'NO_READY_TASK':
    case 'READY':
      return {
        state: 'IDLE',
        delayMs: options.idleMs,
        reason: result.status,
        notifyHuman: false
      };

    case 'TOOL_CAPACITY_WAIT':
      return {
        state: 'WAITING_PROVIDER',
        delayMs: options.blockedMs,
        reason: result.reason || result.status,
        notifyHuman: false
      };

    case 'BLOCKED': {
      const reason = result.reason || 'BLOCKED';
      const recoverable = RECOVERABLE_PROVIDER_MARKERS.some(marker =>
        reason.toLowerCase().includes(marker.toLowerCase())
      );
      return recoverable
        ? {
            state: 'WAITING_PROVIDER',
            delayMs: options.blockedMs,
            reason,
            notifyHuman: false
          }
        : {
            state: 'DEGRADED',
            delayMs: options.blockedMs,
            reason,
            notifyHuman: false
          };
    }

    default:
      return {
        state: 'DEGRADED',
        delayMs: options.blockedMs,
        reason: result.reason || `UNKNOWN_BACKLOG_STATUS:${result.status}`,
        notifyHuman: false
      };
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

function defaultStateDir(root: string): string {
  if (process.env.HUY_AI_SUPERVISOR_STATE_DIR) {
    return resolve(process.env.HUY_AI_SUPERVISOR_STATE_DIR);
  }
  const node01 = '/mnt/data1/HUY-AI/state/supervisors';
  if (existsSync('/mnt/data1')) return node01;
  return join(root, '.artifacts', 'autonomy-supervisor');
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireSupervisorLock(stateDir: string): () => void {
  mkdirSync(stateDir, { recursive: true });
  const lock = join(stateDir, 'persistent-multi-ai.lock');

  if (existsSync(lock)) {
    let priorPid = 0;
    try {
      const prior = JSON.parse(readFileSync(lock, 'utf8')) as { pid?: number };
      priorPid = prior.pid ?? 0;
    } catch {
      // malformed lock is treated as stale and preserved
    }

    if (priorPid && isPidAlive(priorPid)) {
      throw new Error(`SUPERVISOR_ALREADY_RUNNING:${priorPid}`);
    }

    const stale = join(
      stateDir,
      `persistent-multi-ai.lock.stale-${new Date().toISOString().replace(/[:.]/g, '-')}`
    );
    renameSync(lock, stale);
  }

  const fd = openSync(lock, 'wx', 0o600);
  writeFileSync(fd, JSON.stringify({
    pid: process.pid,
    startedAt: new Date().toISOString()
  }) + '\n');
  closeSync(fd);

  return () => {
    try {
      unlinkSync(lock);
    } catch {
      // best-effort cleanup; stale-lock recovery handles crashes
    }
  };
}

function writeAtomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  renameSync(temp, path);
}

function providerSummary(
  health: Record<ProviderId, ProviderHealth>
): Record<ProviderId, Pick<ProviderHealth,
  'available' | 'authenticated' | 'version' | 'circuit' | 'consecutiveFailures' | 'cooldownUntil' | 'lastError'>> {
  return Object.fromEntries(ALL_PROVIDER_IDS.map(id => [id, {
    available: health[id].available,
    authenticated: health[id].authenticated,
    version: health[id].version,
    circuit: health[id].circuit,
    consecutiveFailures: health[id].consecutiveFailures,
    cooldownUntil: health[id].cooldownUntil,
    lastError: health[id].lastError
  }])) as ReturnType<typeof providerSummary>;
}

function hasImplementationProvider(health: Record<ProviderId, ProviderHealth>): boolean {
  return (['codex', 'claude', 'gemini'] as ProviderId[]).some(id =>
    health[id].available &&
    health[id].authenticated &&
    health[id].circuit === 'CLOSED'
  );
}

function writeHumanGateNotice(
  stateDir: string,
  result: BacklogCycleResult
): void {
  writeAtomicJson(join(stateDir, 'HUMAN_GATE.json'), {
    status: 'WAITING_HUMAN',
    taskId: result.taskId ?? null,
    reason: result.reason ?? 'Human approval required',
    requestedAt: new Date().toISOString(),
    instruction: 'Owner action only. AI supervisor remains alive and will resume automatically after gate state changes.'
  });
}

export async function runPersistentSupervisor(
  repositoryRoot: string,
  options: SupervisorOptions = {}
): Promise<void> {
  const root = resolve(repositoryRoot);
  const stateDir = options.stateDir ?? defaultStateDir(root);
  const idleMs = options.idleMs ?? 30_000;
  const blockedMs = options.blockedMs ?? 60_000;
  const providerProbeMs = options.providerProbeMs ?? 60_000;
  const maxTicks = options.maxTicks ?? Number.POSITIVE_INFINITY;

  const release = acquireSupervisorLock(stateDir);
  let state: SupervisorState = 'BOOTING';
  let lastProviderProbe = 0;
  let health = createProviderHealth();
  let tick = 0;

  const heartbeatPath = join(stateDir, 'persistent-multi-ai-heartbeat.json');
  const statePath = join(stateDir, 'persistent-multi-ai-state.json');

  try {
    while (tick < maxTicks) {
      tick += 1;
      const now = Date.now();

      if (now - lastProviderProbe >= providerProbeMs || tick === 1) {
        health = probeProviders(health, now);
        lastProviderProbe = now;
      }

      if (!hasImplementationProvider(health)) {
        state = 'WAITING_PROVIDER';
        const snapshot = {
          state,
          pid: process.pid,
          tick,
          timestamp: new Date().toISOString(),
          reason: 'NO_IMPLEMENTATION_PROVIDER_AVAILABLE',
          providers: providerSummary(health),
          safeToStartNode01Migration: false
        };
        writeAtomicJson(heartbeatPath, snapshot);
        writeAtomicJson(statePath, snapshot);
        if (options.once) return;
        await sleep(blockedMs);
        continue;
      }

      writeAtomicJson(heartbeatPath, {
        state: 'RUNNING',
        pid: process.pid,
        tick,
        timestamp: new Date().toISOString(),
        providers: providerSummary(health),
        safeToStartNode01Migration: false
      });

      let result: BacklogCycleResult;
      try {
        result = await runBacklog(root, true);
      } catch (error) {
        result = {
          status: 'BLOCKED',
          reason: error instanceof Error ? error.message : String(error)
        };
      }

      const decision = decideSupervisorNextAction(result, { idleMs, blockedMs });
      state = decision.state;

      if (decision.notifyHuman) {
        writeHumanGateNotice(stateDir, result);
      }

      writeAtomicJson(statePath, {
        state,
        pid: process.pid,
        tick,
        timestamp: new Date().toISOString(),
        taskId: result.taskId ?? null,
        backlogStatus: result.status,
        reason: decision.reason,
        nextRunAfterMs: decision.delayMs,
        providers: providerSummary(health),
        humanGate: decision.notifyHuman,
        safeToStartNode01Migration: false
      });

      writeAtomicJson(heartbeatPath, {
        state,
        pid: process.pid,
        tick,
        timestamp: new Date().toISOString(),
        taskId: result.taskId ?? null,
        backlogStatus: result.status,
        providers: providerSummary(health),
        safeToStartNode01Migration: false
      });

      if (options.once) return;
      await sleep(decision.delayMs);
    }
  } finally {
    writeAtomicJson(statePath, {
      state: 'STOPPED',
      pid: process.pid,
      timestamp: new Date().toISOString(),
      providers: providerSummary(health),
      safeToStartNode01Migration: false
    });
    release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const once = process.argv.includes('--once');
  runPersistentSupervisor(process.cwd(), { once }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
