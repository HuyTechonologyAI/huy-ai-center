import { spawnSync } from 'node:child_process';
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, rmSync,
  lstatSync, readlinkSync, symlinkSync, copyFileSync, chmodSync
} from 'node:fs';
import { join, dirname, isAbsolute, normalize, resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import type { GitBackupResult, GitDirtyState, UntrackedEntry } from './types.js';

export function verifyGitBundle(bundlePath: string): boolean {
  if (!existsSync(bundlePath)) return false;
  const res = spawnSync('git', ['bundle', 'verify', bundlePath], { encoding: 'utf8' });
  return res.status === 0;
}

export function verifyGitFsck(repoDir: string): boolean {
  const res = spawnSync('git', ['fsck', '--full'], { cwd: repoDir, encoding: 'utf8' });
  return res.status === 0;
}

function sha256Bytes(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertSafeRelativePath(p: string): string {
  if (!p || p.includes('\0') || isAbsolute(p)) {
    throw new Error(`UNSAFE_UNTRACKED_PATH: ${p}`);
  }
  const n = normalize(p).replace(/\\/g, '/');
  if (n === '..' || n.startsWith('../') || n.includes('/../')) {
    throw new Error(`UNSAFE_UNTRACKED_PATH: ${p}`);
  }
  return n;
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
}

function captureUntrackedEntries(repoDir: string, payloadDir?: string): { files: string[]; entries: UntrackedEntry[] } {
  const r = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
    cwd: repoDir,
    encoding: 'buffer'
  });
  if (r.status !== 0) {
    throw new Error(`UNTRACKED_DISCOVERY_FAILED: ${String(r.stderr || '')}`);
  }

  const raw = Buffer.from(r.stdout || Buffer.alloc(0)).toString('utf8');
  const files = raw.split('\0').filter(Boolean).map(assertSafeRelativePath);
  const entries: UntrackedEntry[] = [];

  if (payloadDir) {
    rmSync(payloadDir, { recursive: true, force: true });
    mkdirSync(payloadDir, { recursive: true });
  }

  for (const rel of files) {
    const src = join(repoDir, rel);
    const st = lstatSync(src);
    const mode = st.mode & 0o777;

    if (st.isSymbolicLink()) {
      const target = readlinkSync(src);
      if (isAbsolute(target)) {
        throw new Error(`UNSAFE_SYMLINK_TARGET: ${rel} -> ${target}`);
      }
      const resolvedTarget = resolve(dirname(src), target);
      if (!isWithin(repoDir, resolvedTarget)) {
        throw new Error(`UNSAFE_SYMLINK_TARGET: ${rel} -> ${target}`);
      }

      const entry: UntrackedEntry = {
        path: rel,
        type: 'symlink',
        size: Buffer.byteLength(target),
        sha256: sha256Bytes(target),
        mode,
        linkTarget: target
      };

      if (payloadDir) {
        const dst = join(payloadDir, rel);
        mkdirSync(dirname(dst), { recursive: true });
        symlinkSync(target, dst);
        entry.payloadRelativePath = rel;
      }
      entries.push(entry);
      continue;
    }

    if (!st.isFile()) {
      throw new Error(`UNSUPPORTED_UNTRACKED_ENTRY_TYPE: ${rel}`);
    }

    const bytes = readFileSync(src);
    const entry: UntrackedEntry = {
      path: rel,
      type: 'file',
      size: bytes.length,
      sha256: sha256Bytes(bytes),
      mode
    };

    if (payloadDir) {
      const dst = join(payloadDir, rel);
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
      chmodSync(dst, mode);
      entry.payloadRelativePath = rel;
    }
    entries.push(entry);
  }

  return { files, entries };
}

export function captureDirtyState(repoDir: string, payloadDir?: string): GitDirtyState {
  const unstagedRes = spawnSync('git', ['diff', '--binary'], { cwd: repoDir, encoding: 'utf8' });
  const stagedRes = spawnSync('git', ['diff', '--cached', '--binary'], { cwd: repoDir, encoding: 'utf8' });
  const wtRes = spawnSync('git', ['worktree', 'list', '--porcelain'], { cwd: repoDir, encoding: 'utf8' });

  if (unstagedRes.status !== 0 || stagedRes.status !== 0 || wtRes.status !== 0) {
    throw new Error('DIRTY_STATE_CAPTURE_FAILED');
  }

  const { files: untrackedFiles, entries: untrackedEntries } = captureUntrackedEntries(repoDir, payloadDir);

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
    untrackedEntries,
    worktrees
  };
}

export function createGitBackup(options: {
  repoDir: string;
  outputDir: string;
  projectId: string;
}): GitBackupResult {
  const { repoDir, outputDir, projectId } = options;
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const bundlePath = join(outputDir, `${projectId}.bundle`);
  const bundleRes = spawnSync('git', ['bundle', 'create', bundlePath, '--all'], {
    cwd: repoDir,
    encoding: 'utf8'
  });

  if (bundleRes.status !== 0) {
    throw new Error(`GIT_BUNDLE_CREATION_FAILED for ${projectId}: ${bundleRes.stderr}`);
  }

  const bundleBytes = readFileSync(bundlePath);
  const sha256 = sha256Bytes(bundleBytes);

  if (!verifyGitBundle(bundlePath)) {
    throw new Error(`GIT_BUNDLE_VERIFICATION_FAILED for ${bundlePath}`);
  }

  const refsRes = spawnSync('git', ['show-ref'], { cwd: repoDir, encoding: 'utf8' });
  const refLines = (refsRes.stdout || '').split('\n').filter(Boolean);
  const heads = refLines.filter(l => l.includes('refs/heads/')).map(l => l.split(' ')[1]);
  const tags = refLines.filter(l => l.includes('refs/tags/')).map(l => l.split(' ')[1]);

  const dirtyStatePayloadDir = join(outputDir, `${projectId}-untracked`);
  const dirtyState = captureDirtyState(repoDir, dirtyStatePayloadDir);

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
    dirtyState,
    dirtyStatePayloadDir
  };
}
