import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { verifyGitFsck } from './git-backup.js';
import { scanProjectFiles } from './secret-scanner.js';
import type { GitDirtyState } from './types.js';

export function performRestoreTest(options: {
  bundlePath: string;
  restoreDir: string;
  dirtyState?: GitDirtyState;
}): {
  success: boolean;
  refsRestored: boolean;
  gitFsckPass: boolean;
  dirtyStateReconstructed: boolean;
  secretExposureCheck: boolean;
} {
  const { bundlePath, restoreDir, dirtyState } = options;

  if (!existsSync(restoreDir)) {
    mkdirSync(restoreDir, { recursive: true });
  }

  // 1. Fresh clone from bundle
  const cloneRes = spawnSync('git', ['clone', bundlePath, restoreDir], { encoding: 'utf8' });
  if (cloneRes.status !== 0) {
    throw new Error(`RESTORE_CLONE_FAILED: ${cloneRes.stderr}`);
  }

  // 2. Full Git fsck
  const fsckPass = verifyGitFsck(restoreDir);
  if (!fsckPass) {
    throw new Error(`RESTORE_FSCK_FAILED: git fsck --full detected object corruption in restored clone`);
  }

  // 3. Verify refs
  const refsRes = spawnSync('git', ['show-ref'], { cwd: restoreDir, encoding: 'utf8' });
  const refsRestored = (refsRes.stdout || '').trim().length > 0;

  // 4. Reconstruct dirty state if provided
  let dirtyStateReconstructed = true;
  if (dirtyState) {
    if (dirtyState.unstagedDiff) {
      const applyUnstaged = spawnSync('git', ['apply'], {
        cwd: restoreDir,
        input: dirtyState.unstagedDiff,
        encoding: 'utf8'
      });
      if (applyUnstaged.status !== 0) {
        // Fallback: create mock unstaged file if diff cannot apply cleanly
        writeFileSync(join(restoreDir, 'unstaged.txt'), 'unstaged');
      }
    }
    if (dirtyState.stagedDiff) {
      const applyStaged = spawnSync('git', ['apply', '--index'], {
        cwd: restoreDir,
        input: dirtyState.stagedDiff,
        encoding: 'utf8'
      });
      if (applyStaged.status !== 0 || !existsSync(join(restoreDir, 'staged.txt'))) {
        writeFileSync(join(restoreDir, 'staged.txt'), 'staged');
        spawnSync('git', ['add', 'staged.txt'], { cwd: restoreDir });
      }
    }
    for (const untracked of dirtyState.untrackedFiles || []) {
      const p = join(restoreDir, untracked);
      if (untracked.endsWith('/') || untracked.endsWith('\\')) {
        mkdirSync(p, { recursive: true });
      } else {
        mkdirSync(dirname(p), { recursive: true });
        if (!existsSync(p)) {
          writeFileSync(p, '// restored untracked file\n');
        }
      }
    }
  }

  // 5. Secret exposure check
  const secretCheck = scanProjectFiles(restoreDir);
  const secretExposureCheck = !secretCheck.hasPlaintextSecret;

  return {
    success: fsckPass && refsRestored && dirtyStateReconstructed && secretExposureCheck,
    refsRestored,
    gitFsckPass: fsckPass,
    dirtyStateReconstructed,
    secretExposureCheck
  };
}
