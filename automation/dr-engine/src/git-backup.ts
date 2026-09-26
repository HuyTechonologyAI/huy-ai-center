import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { GitBackupResult, GitDirtyState } from './types.js';

export function verifyGitBundle(bundlePath: string): boolean {
  if (!existsSync(bundlePath)) return false;
  const res = spawnSync('git', ['bundle', 'verify', bundlePath], { encoding: 'utf8' });
  return res.status === 0;
}

export function verifyGitFsck(repoDir: string): boolean {
  const res = spawnSync('git', ['fsck', '--full'], { cwd: repoDir, encoding: 'utf8' });
  return res.status === 0;
}

export function captureDirtyState(repoDir: string): GitDirtyState {
  const unstagedRes = spawnSync('git', ['diff', '--binary'], { cwd: repoDir, encoding: 'utf8' });
  const stagedRes = spawnSync('git', ['diff', '--cached', '--binary'], { cwd: repoDir, encoding: 'utf8' });
  const statusRes = spawnSync('git', ['status', '--porcelain'], { cwd: repoDir, encoding: 'utf8' });
  const wtRes = spawnSync('git', ['worktree', 'list', '--porcelain'], { cwd: repoDir, encoding: 'utf8' });

  const statusLines = (statusRes.stdout || '').split('\n').filter(Boolean);
  const untrackedFiles = statusLines
    .filter(line => line.startsWith('??'))
    .map(line => line.substring(3).trim());

  const worktrees: Array<{ path: string; branch: string; head: string }> = [];
  const wtBlocks = (wtRes.stdout || '').split('\n\n').filter(Boolean);
  for (const block of wtBlocks) {
    const lines = block.split('\n');
    const pathLine = lines.find(l => l.startsWith('worktree '));
    const branchLine = lines.find(l => l.startsWith('branch '));
    const headLine = lines.find(l => l.startsWith('HEAD '));
    if (pathLine) {
      worktrees.push({
        path: pathLine.replace('worktree ', '').trim(),
        branch: branchLine ? branchLine.replace('branch refs/heads/', '').trim() : '',
        head: headLine ? headLine.replace('HEAD ', '').trim() : ''
      });
    }
  }

  const unstagedDiff = unstagedRes.stdout || '';
  const stagedDiff = stagedRes.stdout || '';

  return {
    hasUnstagedChanges: unstagedDiff.length > 0,
    unstagedDiff,
    hasStagedChanges: stagedDiff.length > 0,
    stagedDiff,
    untrackedFiles,
    worktrees
  };
}

export function createGitBackup(options: {
  repoDir: string;
  outputDir: string;
  projectId: string;
}): GitBackupResult {
  const { repoDir, outputDir, projectId } = options;
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const bundlePath = join(outputDir, `${projectId}.bundle`);
  const bundleRes = spawnSync('git', ['bundle', 'create', bundlePath, '--all'], {
    cwd: repoDir,
    encoding: 'utf8'
  });

  if (bundleRes.status !== 0) {
    throw new Error(`GIT_BUNDLE_CREATION_FAILED for ${projectId}: ${bundleRes.stderr}`);
  }

  // Calculate bundle SHA256
  const bundleBytes = readFileSync(bundlePath);
  const sha256 = createHash('sha256').update(bundleBytes).digest('hex');

  // Verify bundle
  if (!verifyGitBundle(bundlePath)) {
    throw new Error(`GIT_BUNDLE_VERIFICATION_FAILED for ${bundlePath}`);
  }

  // Get refs
  const refsRes = spawnSync('git', ['show-ref'], { cwd: repoDir, encoding: 'utf8' });
  const refLines = (refsRes.stdout || '').split('\n').filter(Boolean);
  const heads = refLines.filter(l => l.includes('refs/heads/')).map(l => l.split(' ')[1]);
  const tags = refLines.filter(l => l.includes('refs/tags/')).map(l => l.split(' ')[1]);

  // Capture dirty state
  const dirtyState = captureDirtyState(repoDir);

  // Write diff artifacts alongside bundle
  if (dirtyState.hasUnstagedChanges) {
    writeFileSync(join(outputDir, `${projectId}-unstaged.patch`), dirtyState.unstagedDiff);
  }
  if (dirtyState.hasStagedChanges) {
    writeFileSync(join(outputDir, `${projectId}-staged.patch`), dirtyState.stagedDiff);
  }
  writeFileSync(join(outputDir, `${projectId}-dirty-manifest.json`), JSON.stringify(dirtyState, null, 2));

  return {
    projectId,
    bundlePath,
    sha256,
    refs: { heads, tags },
    dirtyState
  };
}
