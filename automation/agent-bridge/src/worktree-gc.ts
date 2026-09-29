import { statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { listWorktrees } from './worktree-manager.js';

export interface BridgeWorktreeGcEntry {
  taskId: string;
  path: string;
  branch: string;
  clean: boolean;
  ancestorOfCanonical: boolean;
  updatedAtMs: number;
}

export interface BridgeWorktreeGcOptions {
  keepNewest?: number;
  minAgeMs?: number;
  now?: number;
  canonicalRef?: string;
  dryRun?: boolean;
}

export interface BridgeWorktreeGcResult {
  scanned: number;
  selected: string[];
  removed: string[];
  skipped: Array<{ taskId: string; reason: string }>;
}

export function selectBridgeWorktreeGcCandidates(
  entries: BridgeWorktreeGcEntry[],
  options: Pick<BridgeWorktreeGcOptions, 'keepNewest' | 'minAgeMs' | 'now'> = {}
): BridgeWorktreeGcEntry[] {
  const keepNewest = Math.max(0, Math.trunc(options.keepNewest ?? 5));
  const minAgeMs = Math.max(0, Math.trunc(options.minAgeMs ?? 60 * 60_000));
  const now = options.now ?? Date.now();

  const bridge = entries
    .filter(entry => entry.taskId.startsWith('bridge-e2e-live-'))
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

  const protectedPaths = new Set(bridge.slice(0, keepNewest).map(entry => entry.path));

  return bridge.filter(entry =>
    !protectedPaths.has(entry.path) &&
    entry.clean &&
    entry.ancestorOfCanonical &&
    now - entry.updatedAtMs >= minAgeMs
  );
}

function inspectBridgeWorktrees(
  repositoryRoot: string,
  canonicalRef: string
): BridgeWorktreeGcEntry[] {
  return listWorktrees(repositoryRoot)
    .filter(worktree => worktree.taskId.startsWith('bridge-e2e-live-'))
    .map(worktree => {
      const status = spawnSync('git', ['status', '--porcelain'], {
        cwd: worktree.path,
        encoding: 'utf8',
        shell: false
      });
      const head = spawnSync('git', ['rev-parse', 'HEAD'], {
        cwd: worktree.path,
        encoding: 'utf8',
        shell: false
      });
      const ancestor = head.status === 0
        ? spawnSync('git', ['merge-base', '--is-ancestor', head.stdout.trim(), canonicalRef], {
            cwd: repositoryRoot,
            encoding: 'utf8',
            shell: false
          })
        : { status: 1 };

      let updatedAtMs = 0;
      try {
        updatedAtMs = statSync(worktree.path).mtimeMs;
      } catch {
        updatedAtMs = 0;
      }

      return {
        taskId: worktree.taskId,
        path: worktree.path,
        branch: worktree.branch,
        clean: status.status === 0 && status.stdout.trim() === '',
        ancestorOfCanonical: ancestor.status === 0,
        updatedAtMs
      };
    });
}

export function garbageCollectBridgeWorktrees(
  repositoryRoot: string,
  options: BridgeWorktreeGcOptions = {}
): BridgeWorktreeGcResult {
  const canonicalRef = options.canonicalRef ?? 'feature/persistent-multi-ai-runtime';
  const entries = inspectBridgeWorktrees(repositoryRoot, canonicalRef);
  const candidates = selectBridgeWorktreeGcCandidates(entries, options);
  const result: BridgeWorktreeGcResult = {
    scanned: entries.length,
    selected: candidates.map(entry => entry.taskId),
    removed: [],
    skipped: []
  };

  if (options.dryRun) return result;

  for (const entry of candidates) {
    const remove = spawnSync('git', ['worktree', 'remove', entry.path], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      shell: false
    });
    if (remove.status === 0) {
      result.removed.push(entry.taskId);
    } else {
      result.skipped.push({
        taskId: entry.taskId,
        reason: (remove.stderr || remove.stdout || 'WORKTREE_REMOVE_FAILED').trim().slice(0, 1000)
      });
    }
  }

  return result;
}
