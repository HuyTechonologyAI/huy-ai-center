/** Serial, fail-closed roadmap coordinator. Run with npx tsx automation/agent-bridge/src/backlog-runner.ts. */
import { existsSync, mkdirSync, openSync, closeSync, unlinkSync, readFileSync, writeFileSync, renameSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { runTask } from './task-runner.js';
import { checkpointStage, readLatestCheckpoint } from './checkpoints.js';
import type { TaskContract, RiskLevel } from './types.js';

export interface RoadmapNode {
  id: string; title: string; objective: string; risk: RiskLevel;
  depends_on: string[]; allowed_paths: string[]; verification: string[]; human_gate: boolean;
}
export interface Roadmap { mode: string; max_concurrency: number; tasks: RoadmapNode[] }
type Status = 'COMPLETED' | 'BLOCKED' | 'HUMAN_GATE' | 'TOOL_CAPACITY_WAIT' | 'RUNNING';
type BacklogState = { tasks: Record<string, { status: Status; reason?: string; branch?: string; updatedAt: string }> };
const GATED = new Set<RiskLevel>(['R3', 'R4']);
const forbidden = ['.env', '.artifacts/', '.agent-worktrees/', 'secrets/', 'supabase/migrations/', 'supabase/rollback/'];

export function validateRoadmap(roadmap: Roadmap): RoadmapNode[] {
  if (roadmap?.mode !== 'SERIAL_FAIL_CLOSED' || roadmap.max_concurrency !== 1 || !Array.isArray(roadmap.tasks)) throw Error('SERIAL_POLICY_REQUIRED');
  const byId = new Map<string, RoadmapNode>();
  for (const node of roadmap.tasks) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(node.id) || byId.has(node.id)) throw Error('INVALID_OR_DUPLICATE_TASK_ID');
    if (!['R0','R1','R2','R3','R4'].includes(node.risk) || !Array.isArray(node.depends_on) || !Array.isArray(node.allowed_paths) || !Array.isArray(node.verification)) throw Error('INVALID_NODE');
    if (node.allowed_paths.some(path => !path || path.startsWith('/') || path.includes('..'))) throw Error('INVALID_SCOPE');
    byId.set(node.id, node);
  }
  for (const node of byId.values()) for (const dep of node.depends_on) if (!byId.has(dep)) throw Error(`MISSING_DEPENDENCY:${dep}`);
  const sorted: RoadmapNode[] = [], remaining = new Set(byId.keys());
  while (remaining.size) {
    const ready = [...remaining].find(id => byId.get(id)!.depends_on.every(dep => !remaining.has(dep)));
    if (!ready) throw Error('DAG_CYCLE');
    sorted.push(byId.get(ready)!); remaining.delete(ready);
  }
  return sorted;
}

export function projectRoadmapNodeToContract(node: RoadmapNode, baseRef: string): TaskContract {
  const branchId = node.id === 'bridge-b-core' ? 'bridge-b-autonomous-backlog' : node.id;
  return {
    taskId: node.id, title: node.title, objective: node.objective,
    repository: { root: '.', baseRef, taskBranch: `agent-task/${branchId}` },
    scope: { allowedPaths: node.allowed_paths, forbiddenPaths: forbidden },
    risk: { level: node.risk, reason: 'Canonical roadmap risk' },
    execution: { maxCycles: 8, timeoutSeconds: 3600 },
    verification: { commands: node.verification },
    sourceControl: { commitAllowed: true, pushFeatureBranchAllowed: true, prCreationAllowed: false, mergeAllowed: false },
    createdAt: new Date().toISOString(),
  };
}

export function assertPushBranch(branch: string): void {
  if (!/^(agent-task|feature)\/[a-z0-9][a-z0-9-]*$/.test(branch)) throw Error('PUSH_BRANCH_DENIED');
}

function git(cwd: string, ...args: string[]): string {
  const p = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 120000 });
  if (p.status !== 0) throw Error(`GIT_FAILED:${args[0]}:${(p.stderr ?? '').slice(0,200)}`);
  return p.stdout.trim();
}
function persist(path: string, data: unknown): void {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 }); renameSync(temp, path);
}
function lease(path: string, node: RoadmapNode, branch: string, worktree: string): () => void {
  const fd = openSync(path, 'wx', 0o600); // Existing lease is never silently stolen.
  try { writeFileSync(fd, JSON.stringify({ taskId: node.id, pid: process.pid, worktreePath: worktree, taskBranch: branch, owner: 'CODEX_IMPLEMENTER', phase: 'RUNNING', acquiredAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString(), allowedPaths: node.allowed_paths })); }
  finally { closeSync(fd); }
  return () => { if (existsSync(path)) unlinkSync(path); };
}

/** Accept only a real CLI receipt, tied to the unchanged bridge implementation. */
export function assertLiveAcceptance(root: string): void {
  const dir = join(root, '.artifacts/agent-bridge/acceptance');
  if (!existsSync(dir)) throw Error('LIVE_E2E_ACCEPTANCE_REQUIRED');
  const candidates = readdirSync(dir).filter(name => /^bridge-e2e-live-[a-f0-9-]{36}\.json$/.test(name));
  for (const name of candidates) {
    let receipt: { status?: string; featureCommit?: string; audit?: { finalStatus?: string;
      result?: { status?: string; verificationResults?: { passed: boolean }[] } } };
    try { receipt = JSON.parse(readFileSync(join(dir, name), 'utf8')); } catch { continue; }
    if (receipt.status !== 'COMPLETE' || receipt.audit?.finalStatus !== 'PASS' ||
        receipt.audit.result?.status !== 'PASS' || !receipt.audit.result.verificationResults?.length ||
        !receipt.audit.result.verificationResults.every(v => v.passed) ||
        !/^[a-f0-9]{40}$/.test(receipt.featureCommit ?? '')) continue;
    const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', receipt.featureCommit!, 'HEAD'], { cwd: root });
    const changed = spawnSync('git', ['diff', '--quiet', receipt.featureCommit!, 'HEAD', '--',
      'automation/agent-bridge/', 'config/autonomy/', 'package.json'], { cwd: root });
    if (ancestor.status === 0 && changed.status === 0) return;
  }
  throw Error('LIVE_E2E_ACCEPTANCE_REQUIRED');
}

export async function runBacklog(root: string, execute = false): Promise<{ status: string; taskId?: string; reason?: string }> {
  root = resolve(root);
  const roadmap = JSON.parse(readFileSync(join(root, 'config/autonomy/system-roadmap.json'), 'utf8')) as Roadmap;
  const ordered = validateRoadmap(roadmap);
  const runtime = join(root, '.artifacts/agent-bridge'); mkdirSync(join(runtime, 'leases'), { recursive: true });
  const lock = join(runtime, 'backlog-runner.lock');
  const releaseBacklogLock = acquireBacklogLock(lock);
  const statePath = join(runtime, 'backlog-state.json');
  const role = join(runtime, 'phase-ownership.json');
  try {
    const state: BacklogState = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { tasks: {} };
    const branch = git(root, 'branch', '--show-current'); assertPushBranch(branch);
    if (!branch.startsWith('feature/')) throw Error('FEATURE_COORDINATOR_REQUIRED');
    // A read-only status query is useful while the feature patch is under review.
    // Execution still requires an immutable, clean coordination worktree.
    if (execute && git(root, 'status', '--porcelain')) throw Error('PRIMARY_WORKTREE_DIRTY');
    for (const node of ordered) {
      const latest = readLatestCheckpoint(root, node.id);
      if (state.tasks[node.id]?.status === 'COMPLETED') {
        if (latest?.stage !== 'DELIVERY') throw Error('COMPLETION_CHECKPOINT_MISSING');
        continue;
      }
      if (node.depends_on.some(id => state.tasks[id]?.status !== 'COMPLETED')) continue;
      const prior = state.tasks[node.id];
      if (prior?.status === 'HUMAN_GATE') {
        return { status: 'HUMAN_GATE', taskId: node.id, reason: prior.reason ?? 'Owner approval required' };
      }

      const resumableCheckpoint = latest && latest.stage !== 'DELIVERY';
      const retryablePrior =
        prior?.status === 'TOOL_CAPACITY_WAIT' ||
        prior?.status === 'RUNNING' ||
        (prior?.status === 'BLOCKED' && isRetryableBlock(prior.reason));

      if (prior?.status === 'BLOCKED' && !retryablePrior) {
        return { status: 'BLOCKED', taskId: node.id, reason: prior.reason ?? 'Non-retryable previous failure' };
      }

      if (latest?.stage === 'DELIVERY' && prior?.status !== 'COMPLETED') {
        state.tasks[node.id] = {
          status: 'COMPLETED',
          branch: `agent-task/${node.id}`,
          updatedAt: new Date().toISOString()
        };
        persist(statePath, state);
        continue;
      }

      if (resumableCheckpoint || retryablePrior) {
        state.tasks[node.id] = {
          status: 'RUNNING',
          reason: 'AUTO_RESUME_FROM_VERIFIED_CHECKPOINT',
          branch: `agent-task/${node.id}`,
          updatedAt: new Date().toISOString()
        };
        persist(statePath, state);
      }
      const update = (status: Status, reason?: string) => {
        state.tasks[node.id] = { status, reason, branch: `agent-task/${node.id}`, updatedAt: new Date().toISOString() }; persist(statePath, state);
      };
      if (GATED.has(node.risk) || node.human_gate) { update('HUMAN_GATE', `Owner approval required for ${node.risk}`); return { status: 'HUMAN_GATE', taskId: node.id }; }
      if (!execute) return { status: 'READY', taskId: node.id };
      assertLiveAcceptance(root);
      const contract = projectRoadmapNodeToContract(node, branch);
      if (!contract.verification.commands.length) throw Error('VERIFICATION_REQUIRED');
      const worktree = join(root, '.agent-worktrees', node.id === 'bridge-b-core' ? 'bridge-b-autonomous-backlog' : node.id);
      if (existsSync(worktree)) {
        if (git(worktree, 'branch', '--show-current') !== contract.repository.taskBranch || git(worktree, 'status', '--porcelain')) throw Error('TASK_WORKTREE_UNSAFE');
      }
      const leases = join(runtime, 'leases');
      if (requireLeaseFree(leases)) throw Error('OTHER_LEASE_ACTIVE');
      const release = lease(join(leases, `${node.id}.json`), node, contract.repository.taskBranch, worktree);
      try {
        update('RUNNING');
        checkpointStage(root, { taskId: node.id, stage: 'RECEIVED', owner: 'COORDINATOR',
          objective: node.objective, evidence: { node, baseRef: git(root, 'rev-parse', 'HEAD') },
          method: 'validated roadmap DAG, prerequisites and scope', result: 'Eligible R0-R2 task', next: 'PLAN' });
        persist(role, {
          taskId: node.id,
          phase: 'IMPLEMENTING',
          writeOwner: 'PROVIDER_MESH',
          planningRole: 'PLANNER_FAILOVER',
          testDesignerRole: 'TEST_DESIGNER_FAILOVER',
          reviewerRole: 'INDEPENDENT_REVIEWER_FAILOVER'
        });
        const result = await runTask(contract, root, true);
        if (result.status === 'HUMAN_GATE') { update('HUMAN_GATE', 'Task runner requested approval or authentication'); return { status: 'HUMAN_GATE', taskId: node.id }; }
        if (result.status !== 'COMPLETE') { update('BLOCKED', `Task runner: ${result.status}`); return { status: 'BLOCKED', taskId: node.id }; }
        if (git(result.worktree!.path, 'branch', '--show-current') !== contract.repository.taskBranch) throw Error('TASK_BRANCH_CHANGED');
        if (git(result.worktree!.path, 'status', '--porcelain')) throw Error('TASK_WORKTREE_DIRTY_AFTER_COMMIT');
        assertPushBranch(contract.repository.taskBranch);
        git(result.worktree!.path, 'push', 'origin', contract.repository.taskBranch);
        // A dependency is complete only after the feature integration ref
        // contains its commit. --ff-only refuses concurrent/divergent changes.
        if (git(root, 'status', '--porcelain')) throw Error('PRIMARY_WORKTREE_DIRTY_BEFORE_INTEGRATION');
        if (git(root, 'branch', '--show-current') !== branch) throw Error('COORDINATOR_BRANCH_CHANGED');
        git(root, 'merge', '--ff-only', contract.repository.taskBranch);
        git(root, 'push', 'origin', branch);
        checkpointStage(root, { taskId: node.id, stage: 'DELIVERY', owner: 'COORDINATOR',
          objective: node.objective, evidence: { featureBranch: branch, featureCommit: git(root, 'rev-parse', 'HEAD'),
            taskBranch: contract.repository.taskBranch }, method: 'git push origin feature branch',
          result: 'Verified commit pushed to feature integration branch', next: 'Next DAG node',
          receipts: [git(root, 'rev-parse', 'HEAD')] });
        update('COMPLETED');
        return { status: 'COMPLETED', taskId: node.id };
      } catch (error) {
        update('BLOCKED', error instanceof Error ? error.message.slice(0, 300) : 'Unknown error');
        throw error;
      } finally { if (existsSync(role)) unlinkSync(role); release(); }
    }
    return { status: 'NO_READY_TASK' };
  } finally { releaseBacklogLock(); }
}

function processAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireBacklogLock(path: string): () => void {
  if (existsSync(path)) {
    let priorPid = 0;
    try {
      priorPid = (JSON.parse(readFileSync(path, 'utf8')) as { pid?: number }).pid ?? 0;
    } catch {
      // malformed lock is preserved as stale evidence below
    }

    if (priorPid && processAlive(priorPid)) {
      throw Error(`BACKLOG_RUNNER_ALREADY_ACTIVE:${priorPid}`);
    }

    const stale = `${path}.stale-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    renameSync(path, stale);
  }

  const fd = openSync(path, 'wx', 0o600);
  try {
    writeFileSync(fd, JSON.stringify({
      pid: process.pid,
      acquiredAt: new Date().toISOString()
    }) + '\n');
  } finally {
    closeSync(fd);
  }

  return () => {
    if (existsSync(path)) unlinkSync(path);
  };
}

function isRetryableBlock(reason?: string): boolean {
  if (!reason) return false;
  const lower = reason.toLowerCase();
  return [
    'unavailable',
    'tool_capacity_wait',
    'execution_timeout',
    'rate limit',
    '429',
    'temporary capacity',
    'all_providers_unavailable',
    'all_planners_unavailable',
    'audit_invalid'
  ].some(marker => lower.includes(marker));
}

function requireLeaseFree(dir: string): boolean {
  let active = false;
  for (const name of readdirSync(dir).filter(name => name.endsWith('.json'))) {
    const path = join(dir, name);
    try {
      const lease = JSON.parse(readFileSync(path, 'utf8')) as {
        pid?: number;
        expiresAt?: string;
      };
      const expired = lease.expiresAt ? Date.parse(lease.expiresAt) <= Date.now() : false;
      if (expired && !processAlive(lease.pid ?? 0)) {
        const stale = `${path}.stale-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        renameSync(path, stale);
        continue;
      }
      active = true;
    } catch {
      active = true;
    }
  }
  return active;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const execute = process.argv.includes('--execute');
  const all = process.argv.includes('--all');
  if (all && !execute) throw Error('ALL_REQUIRES_EXECUTE');
  (async () => {
    do {
      const result = await runBacklog(process.cwd(), execute);
      console.log(JSON.stringify(result));
      if (!all || result.status !== 'COMPLETED') break;
    } while (true);
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
