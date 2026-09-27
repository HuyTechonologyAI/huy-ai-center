import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateRoadmap, projectRoadmapNodeToContract, assertPushBranch, assertLiveAcceptance, shouldResumeBlockedTask, classifyRemoteSyncFailure, remotePushSpawnOptions, isLocalDeliveryComplete, remoteSyncBackoffMs, runRemotePushWithDeadline, processRemoteSyncQueue, type Roadmap, type RoadmapNode } from '../../automation/agent-bridge/src/backlog-runner.js';
import { collectChangedFiles } from '../../automation/agent-bridge/src/result-auditor.js';
import { createWorktree } from '../../automation/agent-bridge/src/worktree-manager.js';

const source = JSON.parse(readFileSync('config/autonomy/system-roadmap.json', 'utf8')) as Roadmap;
const node = (id: string, depends_on: string[] = []): RoadmapNode => ({
  id, title: id, objective: id, risk: 'R2', depends_on, allowed_paths: ['docs/automation/'], verification: ['npm run typecheck'], human_gate: false,
});
const graph = (tasks: RoadmapNode[]): Roadmap => ({ mode: 'SERIAL_FAIL_CLOSED', max_concurrency: 1, tasks });

test('blocked task resumes only from a verified non-delivery checkpoint', () => {
  assert.equal(shouldResumeBlockedTask({ status: 'BLOCKED', reason: 'Task runner: BLOCKED' }, { stage: 'TEST_DESIGN', status: 'VERIFIED' }), true);
  assert.equal(shouldResumeBlockedTask({ status: 'BLOCKED', reason: 'Task runner: BLOCKED' }, undefined), false);
  assert.equal(shouldResumeBlockedTask({ status: 'HUMAN_GATE', reason: 'Owner approval required' }, { stage: 'TEST_DESIGN', status: 'VERIFIED' }), false);
  assert.equal(shouldResumeBlockedTask({ status: 'BLOCKED', reason: 'Task runner: BLOCKED' }, { stage: 'DELIVERY', status: 'VERIFIED' }), false);
  assert.equal(shouldResumeBlockedTask({ status: 'BLOCKED', reason: 'Task runner: BLOCKED' }, { stage: 'TEST_DESIGN', status: 'UNVERIFIED' }), false);
});

test('canonical roadmap is serial and orders dependencies', () => {
  const nodes = validateRoadmap(source);
  assert.equal(nodes[0].id, 'ai-hr-bootstrap');
  for (const item of nodes) for (const dep of item.depends_on) assert.ok(nodes.indexOf(nodes.find(n => n.id === dep)!) < nodes.indexOf(item));
  const contract = projectRoadmapNodeToContract(nodes[0], 'feature/ai-dev-bridge-b-autonomous-backlog');
  assert.equal(contract.taskId, nodes[0].id);
  assert.equal(contract.repository.taskBranch, 'agent-task/ai-hr-bootstrap');
  assert.ok(contract.scope.allowedPaths.includes('PROJECT_STATE.md'));
  assert.equal(contract.sourceControl.mergeAllowed, false);
});
test('rejects cycles, absent dependencies and parallel mode', () => {
  assert.throws(() => validateRoadmap(graph([node('one',['two']),node('two',['one'])])), /DAG_CYCLE/);
  assert.throws(() => validateRoadmap(graph([node('one',['missing'])])), /MISSING_DEPENDENCY/);
  assert.throws(() => validateRoadmap({ ...graph([node('one')]), max_concurrency: 2 }), /SERIAL_POLICY_REQUIRED/);
});
test('protected and malformed push refs cannot pass the guard', () => {
  for (const name of ['main','master','agent-task/a:main','feature/a --force','refs/heads/main']) assert.throws(() => assertPushBranch(name), /PUSH_BRANCH_DENIED/);
  assert.doesNotThrow(() => assertPushBranch('agent-task/bridge-b-core'));
});
test('git porcelain keeps the first character of a modified filename', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bridge-status-'));
  const git = (...args: string[]) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  git('init'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
  writeFileSync(join(dir, 'tests.txt'), 'initial'); git('add', 'tests.txt'); git('commit', '-m', 'fixture');
  writeFileSync(join(dir, 'tests.txt'), 'changed');
  assert.deepEqual(collectChangedFiles(dir), ['tests.txt']);
  rmSync(dir, { recursive: true, force: true });
});
test('reuses an existing task branch without resetting it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bridge-worktree-'));
  const git = (...args: string[]) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  git('init'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
  writeFileSync(join(dir, 'fixture.txt'), 'initial'); git('add', 'fixture.txt'); git('commit', '-m', 'fixture');
  git('branch', 'agent-task/reused-fixture');
  const result = createWorktree({ taskId: 'reused-fixture', baseBranch: 'HEAD', repositoryRoot: dir });
  assert.equal(result.branch, 'agent-task/reused-fixture');
  assert.equal(result.created, true);
  assert.equal(createWorktree({ taskId: 'reused-fixture', baseBranch: 'HEAD', repositoryRoot: dir }).created, false);
  rmSync(dir, { recursive: true, force: true });
});

test('live acceptance requires a passing CLI receipt bound to an unchanged bridge', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bridge-acceptance-'));
  const git = (...args: string[]) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  try {
    git('init'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
    writeFileSync(join(dir, 'README.md'), 'fixture'); git('add', '.'); git('commit', '-m', 'fixture');
    assert.throws(() => assertLiveAcceptance(dir), /LIVE_E2E_ACCEPTANCE_REQUIRED/);
    const path = join(dir, '.artifacts/agent-bridge/acceptance'); mkdirSync(path, { recursive: true });
    writeFileSync(join(path, 'bridge-e2e-live-12345678-1234-1234-1234-123456789abc.json'), JSON.stringify({
      status: 'COMPLETE', featureCommit: git('rev-parse', 'HEAD'),
      audit: { finalStatus: 'PASS', result: { status: 'PASS', verificationResults: [{ passed: true }] } },
    }));
    assert.doesNotThrow(() => assertLiveAcceptance(dir));
    mkdirSync(join(dir, 'automation/agent-bridge'), { recursive: true });
    writeFileSync(join(dir, 'automation/agent-bridge/changed.ts'), 'changed');
    git('add', '.'); git('commit', '-m', 'bridge changed');
    assert.throws(() => assertLiveAcceptance(dir), /LIVE_E2E_ACCEPTANCE_REQUIRED/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test('worktree safe-directory registration is exact and never wildcard', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const { ensureGitSafeDirectory } = await import('../../automation/agent-bridge/src/worktree-manager.js');

  const root = mkdtempSync(join(tmpdir(), 'huy-safe-dir-'));
  const config = join(root, 'gitconfig');
  writeFileSync(config, '');

  const prior = process.env.GIT_CONFIG_GLOBAL;
  process.env.GIT_CONFIG_GLOBAL = config;
  try {
    const target = join(root, 'repo', '.agent-worktrees', 'task-1');
    ensureGitSafeDirectory(target);

    const result = spawnSync('git', ['config', '--global', '--get-all', 'safe.directory'], {
      encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_GLOBAL: config }
    });
    assert.equal(result.status, 0, result.stderr);
    const values = (result.stdout || '').split('\n').filter(Boolean);
    assert.deepEqual(values, [target]);
    assert.equal(values.some(v => v.includes('*')), false);
  } finally {
    if (prior === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = prior;
  }
});


test('canonical roadmap prioritizes AI HR bootstrap after provider connectivity', async () => {
  const { readFileSync } = await import('node:fs');
  const roadmap = JSON.parse(
    readFileSync('config/autonomy/system-roadmap.json', 'utf8')
  ) as {
    invariants?: Record<string, unknown>;
    tasks: Array<{ id: string; risk: string; human_gate: boolean; allowed_paths: string[] }>;
  };

  assert.equal(roadmap.tasks[0]?.id, 'ai-hr-bootstrap');
  assert.equal(roadmap.tasks[0]?.risk, 'R2');
  assert.equal(roadmap.tasks[0]?.human_gate, false);
  assert.ok(roadmap.tasks[0]?.allowed_paths.includes('config/organization/'));
  assert.equal(roadmap.invariants?.antigravity_role, 'PRIMARY_IMPLEMENTER_AND_PLANNER');
});


test('AI HR charter is fail-closed and cannot self-grant production authority', async () => {
  const { readFileSync } = await import('node:fs');
  const agent = JSON.parse(
    readFileSync('config/organization/ai-hr-agent.json', 'utf8')
  ) as {
    id: string;
    role: string;
    authority: { max_auto_risk: string; production_mutation: string; self_grant_permissions: boolean };
    responsibilities: string[];
  };

  assert.equal(agent.id, 'ai-hr-001');
  assert.equal(agent.role, 'AI_HR_DIRECTOR');
  assert.equal(agent.authority.max_auto_risk, 'R2');
  assert.equal(agent.authority.production_mutation, 'DENY');
  assert.equal(agent.authority.self_grant_permissions, false);
  assert.ok(agent.responsibilities.includes('WORKFORCE_PLANNING'));
  assert.ok(agent.responsibilities.includes('AGENT_RECRUITMENT'));
  assert.ok(agent.responsibilities.includes('CAPABILITY_VERIFICATION'));
});

test('Node01-authoritative delivery classifies remote sync failures correctly', () => {
  assert.equal(classifyRemoteSyncFailure({ stderr: "fatal: could not read Username for 'https://github.com': No such device or address" }), 'SYNC_PENDING');
  assert.equal(classifyRemoteSyncFailure({ stderr: 'fatal: Authentication failed for https://github.com/' }), 'SYNC_PENDING');
  assert.equal(classifyRemoteSyncFailure({ timedOut: true }), 'SYNC_PENDING');
  assert.equal(classifyRemoteSyncFailure({ stderr: 'Connection timed out' }), 'SYNC_PENDING');
  assert.equal(classifyRemoteSyncFailure({ stderr: 'error: failed to push some refs ... [rejected] (non-fast-forward)' }), 'DIVERGED_FAIL_CLOSED');
  assert.equal(classifyRemoteSyncFailure({ stderr: 'fatal: fetch first' }), 'DIVERGED_FAIL_CLOSED');
});

test('remote push options configure non-interactive terminal and positive finite timeout', () => {
  const opts = remotePushSpawnOptions();
  assert.equal(opts.env?.GIT_TERMINAL_PROMPT, '0');
  assert.ok(typeof opts.timeout === 'number' && Number.isFinite(opts.timeout) && opts.timeout > 0);
  assert.ok(opts.timeout! <= 20_000, 'remote sync timeout must stay off the critical path');
  assert.throws(() => assertPushBranch('main'), /PUSH_BRANCH_DENIED/);
  assert.throws(() => assertPushBranch('master'), /PUSH_BRANCH_DENIED/);
});

test('local DELIVERY checkpoint is dependency-complete even when remote sync is SYNC_PENDING', () => {
  assert.equal(isLocalDeliveryComplete({ stage: 'DELIVERY', status: 'VERIFIED' }, 'SYNC_PENDING'), true);
  assert.equal(isLocalDeliveryComplete({ stage: 'DELIVERY' }, 'SYNC_PENDING'), true);
  assert.equal(isLocalDeliveryComplete({ stage: 'DELIVERY', status: 'VERIFIED' }, 'DIVERGED_FAIL_CLOSED'), false);
  assert.equal(isLocalDeliveryComplete({ stage: 'TEST_DESIGN', status: 'VERIFIED' }, 'SYNC_PENDING'), false);
  assert.equal(isLocalDeliveryComplete(undefined, 'SYNC_PENDING'), false);
});

test('deferred remote sync is dependency-complete and backoff is bounded exponential', () => {
  assert.equal(isLocalDeliveryComplete({ stage: 'DELIVERY', status: 'VERIFIED' }, 'REMOTE_SYNC_DEFERRED'), true);
  assert.equal(remoteSyncBackoffMs(1), 30_000);
  assert.equal(remoteSyncBackoffMs(2), 60_000);
  assert.equal(remoteSyncBackoffMs(3), 120_000);
  assert.equal(remoteSyncBackoffMs(99), 900_000);
});

test('remote push deadline terminates the whole process group', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'remote-sync-timeout-'));
  const fakeGit = join(dir, 'fake-git.sh');
  const pidFile = join(dir, 'child.pid');
  writeFileSync(fakeGit, '#!/bin/sh\nsleep 30 &\necho $! > "$HUY_CHILD_PID_FILE"\nwait\n');
  chmodSync(fakeGit, 0o755);
  try {
    const started = Date.now();
    const result = await runRemotePushWithDeadline(dir, 'agent-task/test-sync', {
      timeoutMs: 250, gitBinary: fakeGit, env: { ...process.env, HUY_CHILD_PID_FILE: pidFile }
    });
    assert.equal(result.timedOut, true);
    assert.ok(Date.now() - started < 5_000);
    const childPid = Number(readFileSync(pidFile, 'utf8').trim());
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.throws(() => process.kill(childPid, 0));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('remote sync worker migrates legacy queue records before retrying', async () => {
  const root = mkdtempSync(join(tmpdir(), 'remote-sync-legacy-'));
  const runtime = join(root, '.artifacts', 'agent-bridge');
  const fakeGit = join(root, 'git');
  mkdirSync(runtime, { recursive: true });
  writeFileSync(fakeGit, '#!/bin/sh\nexit 0\n');
  chmodSync(fakeGit, 0o755);
  const syncPath = join(runtime, 'remote-sync-legacy-task.json');
  writeFileSync(syncPath, JSON.stringify({
    taskId: 'legacy-task',
    featureBranch: 'feature/persistent-multi-ai-runtime',
    featureCommit: 'a'.repeat(40),
    taskBranch: 'agent-task/legacy-task',
    status: 'SYNC_PENDING',
    updatedAt: new Date(0).toISOString()
  }));
  const priorPath = process.env.PATH;
  process.env.PATH = root + ':' + priorPath;
  try {
    const result = await processRemoteSyncQueue(root, Date.now());
    const state = JSON.parse(readFileSync(syncPath, 'utf8'));
    assert.equal(result.status, 'SYNCED');
    assert.deepEqual(state.refs, ['agent-task/legacy-task', 'feature/persistent-multi-ai-runtime']);
    assert.equal(state.attempts.length, 2);
  } finally {
    process.env.PATH = priorPath;
    rmSync(root, { recursive: true, force: true });
  }
});
