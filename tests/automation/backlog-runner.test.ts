import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateRoadmap, projectRoadmapNodeToContract, assertPushBranch, assertLiveAcceptance, type Roadmap, type RoadmapNode } from '../../automation/agent-bridge/src/backlog-runner.js';
import { collectChangedFiles } from '../../automation/agent-bridge/src/result-auditor.js';
import { createWorktree } from '../../automation/agent-bridge/src/worktree-manager.js';

const source = JSON.parse(readFileSync('config/autonomy/system-roadmap.json', 'utf8')) as Roadmap;
const node = (id: string, depends_on: string[] = []): RoadmapNode => ({
  id, title: id, objective: id, risk: 'R2', depends_on, allowed_paths: ['docs/automation/'], verification: ['npm run typecheck'], human_gate: false,
});
const graph = (tasks: RoadmapNode[]): Roadmap => ({ mode: 'SERIAL_FAIL_CLOSED', max_concurrency: 1, tasks });

test('canonical roadmap is serial and orders dependencies', () => {
  const nodes = validateRoadmap(source);
  assert.equal(nodes[0].id, '06k-c-readiness');
  for (const item of nodes) for (const dep of item.depends_on) assert.ok(nodes.indexOf(nodes.find(n => n.id === dep)!) < nodes.indexOf(item));
  const contract = projectRoadmapNodeToContract(nodes[0], 'feature/ai-dev-bridge-b-autonomous-backlog');
  assert.equal(contract.taskId, nodes[0].id);
  assert.equal(contract.repository.taskBranch, 'agent-task/06k-c-readiness');
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
