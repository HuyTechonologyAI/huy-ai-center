#!/usr/bin/env node
// AI-DEV-BRIDGE-B: local, serial A2A coordinator. No production or main writes.
import { readFile, writeFile, mkdir, open, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GATED = new Set(['R3', 'R4']);
const INVALID = /(?:no output produced|auto-denied|permission required|dangerously-skip-permissions)/i;
const CAPACITY = /(?:rate limit|too many requests|usage limit|quota exhausted|insufficient_quota|resource exhausted|model overloaded|server capacity exceeded|\b429\b)/i;

export function validateRoadmap(roadmap) {
  if (roadmap?.mode !== 'SERIAL_FAIL_CLOSED' || roadmap.max_concurrency !== 1 || !Array.isArray(roadmap.tasks)) throw Error('ROADMAP_POLICY_INVALID');
  const byId = new Map();
  for (const task of roadmap.tasks) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(task.id) || byId.has(task.id)) throw Error('DUPLICATE_OR_INVALID_TASK_ID');
    if (!Array.isArray(task.depends_on) || !Array.isArray(task.allowed_paths) || !['R0','R1','R2','R3','R4'].includes(task.risk)) throw Error('TASK_POLICY_INVALID');
    byId.set(task.id, task);
  }
  const sorted = [], pending = new Set(byId.keys());
  for (const task of byId.values()) for (const dep of task.depends_on) if (!byId.has(dep)) throw Error(`MISSING_DEPENDENCY:${dep}`);
  while (pending.size) {
    const next = [...pending].find(id => byId.get(id).depends_on.every(dep => !pending.has(dep)));
    if (!next) throw Error('DAG_CYCLE_DETECTED');
    pending.delete(next); sorted.push(byId.get(next));
  }
  return sorted;
}

export function decideTask(task, completed) {
  if (!task.depends_on.every(id => completed.has(id))) return 'BLOCKED';
  if (GATED.has(task.risk) || task.human_gate) return 'HUMAN_GATE';
  return 'READY';
}

export function checkScope(files, allowed) {
  for (const name of files) {
    if (!name || name.includes('..') || name.startsWith('/') || name.startsWith('.artifacts/') || name.startsWith('supabase/') || name === '.env' || name.startsWith('secrets/')) throw Error(`SCOPE_VIOLATION:${name}`);
    if (!allowed.some(p => p.endsWith('/') ? name.startsWith(p) : name === p)) throw Error(`SCOPE_VIOLATION:${name}`);
  }
}

export function parseGitStatus(output) {
  return output.split('\n').filter(Boolean).map(line => {
    if (!/^[ MADRCU?!]{2} /.test(line)) throw Error('GIT_STATUS_INVALID');
    return { code: line.slice(0, 2), path: line.slice(3) };
  });
}

function run(binary, args, cwd, input, timeout = 600000) {
  return new Promise((done, reject) => {
    const child = spawn(binary, args, { cwd, stdio: ['pipe','pipe','pipe'], shell: false, env: { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, TMPDIR: process.env.TMPDIR ?? '/tmp' } });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
    child.stdout.on('data', b => stdout += b);
    child.stderr.on('data', b => stderr += b);
    child.on('error', reject);
    child.on('close', code => { clearTimeout(timer); done({ code, stdout, stderr }); });
    child.stdin.end(input ?? '');
  });
}

async function checked(binary, args, cwd, input, timeout) {
  const result = await run(binary, args, cwd, input, timeout);
  if (result.code !== 0 && CAPACITY.test(result.stdout + result.stderr)) throw Error('TOOL_CAPACITY_WAIT');
  if (result.code !== 0 || INVALID.test(result.stdout + result.stderr)) throw Error(`${binary.toUpperCase()}_FAILED:${(result.stderr || result.stdout).slice(0,400)}`);
  // Preserve leading spaces: Git porcelain status uses them as status columns.
  return result.stdout.replace(/\r?\n$/, '');
}

async function git(cwd, ...args) { return checked('git', args, cwd); }

async function saveState(path, state) { await writeFile(path, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 }); }

export async function execute(root, opts = {}) {
  root = resolve(root);
  const roadmap = JSON.parse(await readFile(join(root, 'config/autonomy/system-roadmap.json'), 'utf8'));
  const tasks = validateRoadmap(roadmap);
  const artifacts = join(root, '.artifacts/agent-bridge');
  await mkdir(artifacts, { recursive: true });
  const lockPath = join(artifacts, 'a2a-runner.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); } catch (e) { if (e.code === 'EEXIST') throw Error('RUNNER_ALREADY_ACTIVE'); throw e; }
  const statePath = join(artifacts, 'backlog-state.json');
  let state = { tasks: {} };
  try {
    try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    state.tasks ??= {};
    if (await git(root, 'status', '--porcelain')) throw Error('PRIMARY_WORKTREE_DIRTY');
    const branch = await git(root, 'branch', '--show-current');
    if (!branch.startsWith('feature/')) throw Error('FEATURE_BRANCH_REQUIRED');
    const completed = new Set(Object.entries(state.tasks).filter(([, v]) => v.status === 'COMPLETED').map(([k]) => k));
    for (const task of tasks) {
      if (state.tasks[task.id]?.status === 'COMPLETED') continue;
      if (state.tasks[task.id]?.status === 'BLOCKED') return { status: 'BLOCKED', taskId: task.id, reason: state.tasks[task.id].reason };
      const decision = decideTask(task, completed);
      if (decision === 'BLOCKED') continue;
      if (decision === 'HUMAN_GATE') {
        state.tasks[task.id] = { status: 'HUMAN_GATE', risk: task.risk, reason: 'Human approval required before execution' };
        await saveState(statePath, state);
        return { status: 'HUMAN_GATE', taskId: task.id };
      }
      // The bootstrap task is already checked out locally. Never create or overwrite a branch.
      const worktree = resolve(root, '.agent-worktrees', task.id === 'bridge-b-core' ? 'bridge-b-autonomous-backlog' : task.id);
      const taskBranch = `agent-task/${task.id === 'bridge-b-core' ? 'bridge-b-autonomous-backlog' : task.id}`;
      const existingBranch = await git(worktree, 'branch', '--show-current').catch(() => '');
      if (existingBranch !== taskBranch) throw Error(`TASK_WORKTREE_REQUIRED:${worktree}`);
      if (await git(worktree, 'status', '--porcelain')) throw Error('TASK_WORKTREE_DIRTY');
      const leaseDir = join(artifacts, 'leases');
      await mkdir(leaseDir, { recursive: true });
      const leasePath = join(leaseDir, `${task.id}.json`);
      let lease;
      try { lease = await open(leasePath, 'wx', 0o600); } catch (e) { if (e.code === 'EEXIST') throw Error('TASK_LEASE_ACTIVE'); throw e; }
      await lease.writeFile(JSON.stringify({ taskId: task.id, pid: process.pid, worktreePath: worktree, taskBranch, owner: 'CODEX_IMPLEMENTER', allowedPaths: task.allowed_paths, acquiredAt: new Date().toISOString() }));
      await lease.close();
      const rolePath = join(artifacts, 'phase-ownership.json');
      try {
      state.tasks[task.id] = { status: 'PLANNING', branch: taskBranch, updatedAt: new Date().toISOString() };
      await saveState(statePath, state);
      const brief = `Task: ${task.title}\nObjective: ${task.objective}\nAllowed paths: ${task.allowed_paths.join(', ')}\nRisk: ${task.risk}\nVerification: ${task.verification.join(', ')}`;
      const contextFiles = ['docs/automation/AI_DEV_BRIDGE_B_AUTONOMOUS_BACKLOG_SPEC.md', 'automation/tasks/ai-dev-bridge-b-autonomous-backlog.json', 'config/autonomy/system-roadmap.json'];
      const context = (await Promise.all(contextFiles.map(async path => `${path}:\n${(await readFile(join(worktree, path), 'utf8')).slice(0, 16000)}`))).join('\n\n');
      const plan = await checked('agy', ['-p', `READ_ONLY PLANNER. Use supplied source content. Do not use tools, commands or write files. Return a concrete implementation plan for:\n${brief}\n${context}`, '--output-format', 'text'], worktree);
      if (!plan) throw Error('AGENT_PLAN_INVALID');
      state.tasks[task.id].status = 'IMPLEMENTING'; await saveState(statePath, state);
      await saveState(rolePath, { taskId: task.id, phase: 'IMPLEMENTING', writeOwner: 'CODEX', antigravityMode: 'READ_ONLY_AUDITOR' });
      const prompt = `You are the sole implementation writer in this isolated task worktree. Implement this plan:\n${plan}\n${brief}\nNever modify the primary worktree, production, main, secrets, or files outside allowed paths. Do not commit or push. Run required local verification. Stop if a permission is missing.`;
      await checked('codex', ['exec', '--sandbox', 'workspace-write', '--ephemeral', prompt], worktree, '', 3600000);
      const entries = parseGitStatus(await git(worktree, 'status', '--porcelain', '--untracked-files=all'));
      if (entries.length === 0) throw Error('IMPLEMENTATION_EMPTY');
      const changed = entries.map(entry => entry.path);
      checkScope(changed, task.allowed_paths);
      state.tasks[task.id].status = 'VERIFYING'; await saveState(statePath, state);
      await checked('npm', ['run', 'build:shared'], worktree, '', 3600000);
      for (const command of task.verification) {
        if (!['npm run typecheck', 'npm run test:bridge', 'npm run build:shared', 'npm run test:core'].includes(command)) throw Error(`VERIFICATION_NOT_ALLOWED:${command}`);
        await checked('npm', command.split(' ').slice(1), worktree, '', 3600000);
      }
      const trackedDiff = await git(worktree, 'diff', 'HEAD', '--', ...entries.filter(entry => entry.code !== '??').map(entry => entry.path));
      const untracked = await Promise.all(entries.filter(entry => entry.code === '??').map(async entry => `${entry.path}:\n${(await readFile(join(worktree, entry.path), 'utf8')).slice(0, 12000)}`));
      const diff = trackedDiff + '\n' + untracked.join('\n');
      if (diff.length > 90000) throw Error('AUDIT_CONTEXT_TOO_LARGE');
      state.tasks[task.id].status = 'AUDITING'; await saveState(statePath, state);
      await saveState(rolePath, { taskId: task.id, phase: 'AUDITING', writeOwner: 'NONE', antigravityMode: 'READ_ONLY_AUDITOR' });
      const audit = await checked('agy', ['-p', `READ_ONLY FINAL AUDITOR. Do not run commands or write files. Review task and changed files. Respond exactly PASS or CORRECTION_REQUIRED with reasons.\n${brief}\nPlan:\n${plan}\nChanges:\n${diff}`, '--output-format', 'text'], worktree);
      if (!/^PASS\b/.test(audit.trim())) throw Error(`AUDIT_NOT_PASS:${audit.slice(0,300)}`);
      if (!opts.execute) { state.tasks[task.id].status = 'AWAITING_REVIEW'; await saveState(statePath, state); return { status: 'AWAITING_REVIEW', taskId: task.id, worktree, changed }; }
      // Only these two branch namespaces are writable. Git never receives a main ref.
      if (!/^agent-task\/[a-z0-9-]+$/.test(taskBranch) || !/^feature\/[a-z0-9-]+$/.test(branch)) throw Error('BRANCH_GUARD');
      await git(worktree, 'add', '--', ...changed);
      await git(worktree, 'commit', '-m', `automation(bridge): ${task.id}`);
      await git(worktree, 'push', 'origin', taskBranch);
      await git(root, 'merge', '--ff-only', taskBranch);
      await git(root, 'push', 'origin', branch);
      state.tasks[task.id].status = 'COMPLETED'; completed.add(task.id); await saveState(statePath, state);
      return { status: 'COMPLETED', taskId: task.id, branch, changed };
      } finally { await unlink(rolePath).catch(() => {}); await unlink(leasePath).catch(() => {}); }
    }
    return { status: 'NO_READY_TASK' };
  } catch (e) {
    const current = Object.entries(state.tasks).find(([,v]) => ['PLANNING','IMPLEMENTING','VERIFYING','AUDITING'].includes(v.status));
    if (current) { current[1].status = e.message === 'TOOL_CAPACITY_WAIT' ? 'TOOL_CAPACITY_WAIT' : 'BLOCKED'; current[1].reason = e.message; await saveState(statePath, state); }
    throw e;
  } finally { await lock.close(); await unlink(lockPath); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  execute(process.cwd(), { execute: process.argv.includes('--execute') }).then(r => { console.log(JSON.stringify(r, null, 2)); }).catch(e => { console.error(e.message); process.exitCode = 1; });
}
