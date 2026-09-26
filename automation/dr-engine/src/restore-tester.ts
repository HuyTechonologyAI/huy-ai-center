import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readFileSync, lstatSync, chmodSync,
  copyFileSync, symlinkSync, readlinkSync
} from 'node:fs';
import { join, dirname, isAbsolute, normalize, resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { verifyGitFsck } from './git-backup.js';
import { scanProjectFiles } from './secret-scanner.js';
import type { GitDirtyState, UntrackedEntry } from './types.js';

function sha256Bytes(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
}

function safeRel(p: string): string {
  if (!p || p.includes('\0') || isAbsolute(p)) throw new Error(`UNSAFE_UNTRACKED_PATH: ${p}`);
  const n = normalize(p).replace(/\\/g, '/');
  if (n === '..' || n.startsWith('../') || n.includes('/../')) {
    throw new Error(`UNSAFE_UNTRACKED_PATH: ${p}`);
  }
  return n;
}

function restoreUntrackedEntry(
  restoreDir: string,
  payloadDir: string,
  entry: UntrackedEntry
): void {
  const rel = safeRel(entry.path);
  const dst = join(restoreDir, rel);
  const payloadRel = safeRel(entry.payloadRelativePath || rel);
  const src = join(payloadDir, payloadRel);

  if (!existsSync(src)) {
    throw new Error(`UNTRACKED_PAYLOAD_MISSING: ${rel}`);
  }

  mkdirSync(dirname(dst), { recursive: true });

  if (entry.type === 'symlink') {
    const st = lstatSync(src);
    if (!st.isSymbolicLink()) {
      throw new Error(`UNTRACKED_PAYLOAD_TYPE_MISMATCH: ${rel}`);
    }
    const target = readlinkSync(src);
    if (isAbsolute(target)) {
      throw new Error(`UNSAFE_SYMLINK_TARGET: ${rel} -> ${target}`);
    }
    if (!isWithin(restoreDir, resolve(dirname(dst), target))) {
      throw new Error(`UNSAFE_SYMLINK_TARGET: ${rel} -> ${target}`);
    }
    if (target !== entry.linkTarget || sha256Bytes(target) !== entry.sha256) {
      throw new Error(`UNTRACKED_SYMLINK_MISMATCH: ${rel}`);
    }
    symlinkSync(target, dst);
    return;
  }

  const st = lstatSync(src);
  if (!st.isFile()) throw new Error(`UNTRACKED_PAYLOAD_TYPE_MISMATCH: ${rel}`);
  const bytes = readFileSync(src);
  if (bytes.length !== entry.size || sha256Bytes(bytes) !== entry.sha256) {
    throw new Error(`UNTRACKED_PAYLOAD_HASH_MISMATCH: ${rel}`);
  }
  copyFileSync(src, dst);
  chmodSync(dst, entry.mode);
}

function verifyRestoredUntracked(restoreDir: string, entry: UntrackedEntry): void {
  const p = join(restoreDir, safeRel(entry.path));
  let st;
  try {
    st = lstatSync(p);
  } catch {
    throw new Error(`RESTORED_UNTRACKED_MISSING: ${entry.path}`);
  }

  if (entry.type === 'symlink') {
    if (!st.isSymbolicLink()) throw new Error(`RESTORED_UNTRACKED_TYPE_MISMATCH: ${entry.path}`);
    const target = readlinkSync(p);
    if (target !== entry.linkTarget || sha256Bytes(target) !== entry.sha256) {
      throw new Error(`RESTORED_UNTRACKED_HASH_MISMATCH: ${entry.path}`);
    }
    return;
  }

  if (!st.isFile()) throw new Error(`RESTORED_UNTRACKED_TYPE_MISMATCH: ${entry.path}`);
  const bytes = readFileSync(p);
  if (bytes.length !== entry.size || sha256Bytes(bytes) !== entry.sha256) {
    throw new Error(`RESTORED_UNTRACKED_HASH_MISMATCH: ${entry.path}`);
  }
  if ((st.mode & 0o777) !== entry.mode) {
    throw new Error(`RESTORED_UNTRACKED_MODE_MISMATCH: ${entry.path}`);
  }
}

export function performRestoreTest(options: {
  bundlePath: string;
  restoreDir: string;
  dirtyState?: GitDirtyState;
  dirtyStatePayloadDir?: string;
}): {
  success: boolean;
  refsRestored: boolean;
  gitFsckPass: boolean;
  dirtyStateReconstructed: boolean;
  secretExposureCheck: boolean;
} {
  const { bundlePath, restoreDir, dirtyState, dirtyStatePayloadDir } = options;

  if (existsSync(restoreDir)) {
    throw new Error(`RESTORE_DIR_MUST_NOT_EXIST: ${restoreDir}`);
  }

  mkdirSync(dirname(restoreDir), { recursive: true });

  const cloneRes = spawnSync('git', ['clone', bundlePath, restoreDir], { encoding: 'utf8' });
  if (cloneRes.status !== 0) {
    throw new Error(`RESTORE_CLONE_FAILED: ${cloneRes.stderr || cloneRes.stdout}`);
  }

  const fsckPass = verifyGitFsck(restoreDir);
  if (!fsckPass) {
    throw new Error('RESTORE_FSCK_FAILED: git fsck --full detected object corruption in restored clone');
  }

  const refsRes = spawnSync('git', ['show-ref'], { cwd: restoreDir, encoding: 'utf8' });
  const refsRestored = refsRes.status === 0 && (refsRes.stdout || '').trim().length > 0;
  if (!refsRestored) throw new Error('RESTORE_REFS_MISSING');

  let dirtyStateReconstructed = true;

  if (dirtyState) {
    if (dirtyState.stagedDiff) {
      const applyStaged = spawnSync('git', ['apply', '--index', '--binary'], {
        cwd: restoreDir,
        input: dirtyState.stagedDiff,
        encoding: 'utf8'
      });
      if (applyStaged.status !== 0) {
        throw new Error(`RESTORE_STAGED_APPLY_FAILED: ${applyStaged.stderr || applyStaged.stdout}`);
      }
    }

    if (dirtyState.unstagedDiff) {
      const applyUnstaged = spawnSync('git', ['apply', '--binary'], {
        cwd: restoreDir,
        input: dirtyState.unstagedDiff,
        encoding: 'utf8'
      });
      if (applyUnstaged.status !== 0) {
        throw new Error(`RESTORE_UNSTAGED_APPLY_FAILED: ${applyUnstaged.stderr || applyUnstaged.stdout}`);
      }
    }

    const entries = dirtyState.untrackedEntries || [];
    if ((dirtyState.untrackedFiles || []).length > 0 && entries.length === 0) {
      throw new Error('UNTRACKED_PAYLOAD_MANIFEST_MISSING');
    }
    if (entries.length > 0 && !dirtyStatePayloadDir) {
      throw new Error('UNTRACKED_PAYLOAD_DIR_MISSING');
    }

    for (const entry of entries) {
      restoreUntrackedEntry(restoreDir, dirtyStatePayloadDir!, entry);
    }
    for (const entry of entries) {
      verifyRestoredUntracked(restoreDir, entry);
    }

    const stagedNow = spawnSync('git', ['diff', '--cached', '--binary'], { cwd: restoreDir, encoding: 'utf8' });
    const unstagedNow = spawnSync('git', ['diff', '--binary'], { cwd: restoreDir, encoding: 'utf8' });

    if (stagedNow.status !== 0 || unstagedNow.status !== 0) {
      throw new Error('RESTORE_DIRTY_STATE_VERIFY_FAILED');
    }
    if ((stagedNow.stdout || '') !== (dirtyState.stagedDiff || '')) {
      throw new Error('RESTORE_STAGED_DIFF_MISMATCH');
    }
    if ((unstagedNow.stdout || '') !== (dirtyState.unstagedDiff || '')) {
      throw new Error('RESTORE_UNSTAGED_DIFF_MISMATCH');
    }
  }

  const secretCheck = scanProjectFiles(restoreDir);
  const secretExposureCheck = !secretCheck.hasPlaintextSecret;
  if (!secretExposureCheck) {
    throw new Error('RESTORE_SECRET_EXPOSURE_DETECTED');
  }

  return {
    success: fsckPass && refsRestored && dirtyStateReconstructed && secretExposureCheck,
    refsRestored,
    gitFsckPass: fsckPass,
    dirtyStateReconstructed,
    secretExposureCheck
  };
}
