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
import { spawnSync } from 'node:child_process';
import { runBacklog } from './backlog-runner.js';
import { redact } from './log-redactor.js';
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
  'AUDIT_INVALID',
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

export function classifyStall(
  previous: (Partial<BacklogCycleResult> & { repeatCount?: number }) | undefined,
  current: BacklogCycleResult,
  threshold: number
): BacklogCycleResult & { state: 'STALLED' | 'PROGRESS'; repeatCount: number } {
  const repeats = previous !== undefined && previous.taskId === current.taskId &&
    previous.status === current.status && previous.reason === current.reason;
  const repeatCount = repeats ? (previous.repeatCount ?? 0) + 1 : 1;
  return {
    taskId: current.taskId, status: current.status, reason: current.reason,
    state: repeatCount >= Math.max(1, threshold) ? 'STALLED' : 'PROGRESS',
    repeatCount
  };
}

export function buildBottleneckReport(input: {
  taskId?: string;
  reason?: string;
  state: SupervisorState;
  providers: Partial<Record<ProviderId, Partial<ProviderHealth>>>;
  timestamp: string;
}) {
  // Allowlist health metadata; never copy provider errors or arbitrary nested fields.
  const providers = Object.fromEntries(ALL_PROVIDER_IDS.flatMap(id => {
    const provider = input.providers[id];
    if (!provider) return [];
    return [[id, Object.fromEntries(
      (['available', 'authenticated', 'circuit', 'consecutiveFailures', 'cooldownUntil'] as const)
        .flatMap(key => {
          const value = provider[key];
          if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) ||
              (key === 'circuit' && ['OPEN', 'CLOSED', 'HALF_OPEN'].includes(String(value)))) {
            return [[key, value]];
          }
          return [];
        })
    )]];
  }));
  return {
    taskId: redact(input.taskId ?? ''),
    reason: redact(input.reason ?? ''),
    supervisorState: input.state,
    providers,
    timestamp: redact(input.timestamp),
    recommendedAction: 'Automatic retry/failover when permitted by supervisor decisions, preserving fail-closed gates and required human approval.'
  };
}

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

    case 'AUDIT_INVALID':
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


function runNpm(root: string, args: string[]): { ok: boolean; output: string } {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 30 * 60_000,
    shell: false,
    env: { ...process.env }
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ''}\n${result.stderr ?? ''}`.slice(-12000)
  };
}

function repairLiveAcceptance(root: string): { repaired: boolean; reason: string } {
  const sequence: string[][] = [
    ['run', 'build:shared'],
    ['run', 'typecheck'],
    ['run', 'test:bridge'],
    ['run', 'bridge:acceptance:live']
  ];

  for (const args of sequence) {
    const result = runNpm(root, args);
    if (!result.ok) {
      return {
        repaired: false,
        reason: `SELF_REPAIR_FAILED:npm ${args.join(' ')}:${result.output.slice(-3000)}`
      };
    }
  }

  return { repaired: true, reason: 'LIVE_ACCEPTANCE_REGENERATED' };
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
  let stall: ReturnType<typeof classifyStall> | undefined;
  const stallThreshold = 3;

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
        const reason = error instanceof Error ? error.message : String(error);

        if (reason.includes('LIVE_E2E_ACCEPTANCE_REQUIRED')) {
          const repair = repairLiveAcceptance(root);
          if (repair.repaired) {
            try {
              result = await runBacklog(root, true);
            } catch (retryError) {
              result = {
                status: 'BLOCKED',
                reason: retryError instanceof Error ? retryError.message : String(retryError)
              };
            }
          } else {
            result = { status: 'BLOCKED', reason: repair.reason };
          }
        } else {
          result = { status: 'BLOCKED', reason };
        }
      }

      const decision = decideSupervisorNextAction(result, { idleMs, blockedMs });
      state = decision.state;
      stall = classifyStall(stall, result, stallThreshold);
      if (stall.state === 'STALLED' && stall.repeatCount === stallThreshold) {
        const report = buildBottleneckReport({
          taskId: result.taskId, reason: result.reason, state,
          providers: health, timestamp: new Date().toISOString()
        });
        const reportDir = existsSync('/mnt/data1')
          ? '/mnt/data1/HUY-AI/state/bottlenecks' : join(stateDir, 'bottlenecks');
        const safeTaskId = report.taskId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100) || 'no-task';
        const filename = `${report.timestamp.replace(/[^a-zA-Z0-9_-]/g, '-')}-${safeTaskId}.md`;
        try {
          mkdirSync(reportDir, { recursive: true });
          writeFileSync(join(reportDir, filename),
            '# Supervisor bottleneck\n\n' + JSON.stringify(report, null, 2).split('\n')
              .map(line => `    ${line}`).join('\n') + '\n', { mode: 0o600 });
        } catch {
          // Telemetry failure must not interrupt retry or bypass supervisor gates.
          console.error('BOTTLENECK_REPORT_WRITE_FAILED');
        }
      }

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
