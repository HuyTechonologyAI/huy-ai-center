/**
 * WORKTREE MANAGER — Git worktree isolation for agent tasks
 * Phase: AI-DEV-BRIDGE-A
 *
 * Each automated task gets an isolated Git worktree so Antigravity
 * and Codex never share a working tree concurrently.
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import type { WorktreeInfo } from "./types.js";

const WORKTREES_ROOT = ".agent-worktrees";

function worktreePath(taskId: string): string {
  return resolve(process.cwd(), WORKTREES_ROOT, taskId);
}

function sanitizeTaskId(taskId: string): string {
  return taskId.replace(/[^a-zA-Z0-9_-]/g, "-");
}

/**
 * Create an isolated worktree for the given task.
 * Creates a new branch from baseBranch.
 * Reconciled contract: taskBranch is authoritative after validation.
 */
export function createWorktree(params: {
  taskId: string;
  baseBranch: string;
  repositoryRoot: string;
  taskBranch?: string;
}): WorktreeInfo {
  const { taskId, baseBranch, repositoryRoot, taskBranch } = params;
  const safeId = sanitizeTaskId(taskId);
  const path = join(repositoryRoot, WORKTREES_ROOT, safeId);

  const branch = (taskBranch && taskBranch.trim()) ? taskBranch.trim() : `agent-task/${safeId}`;

  // Security guard: Prevent protected refs from being used as task branch
  const lowerBranch = branch.toLowerCase();
  if (
    lowerBranch === "main" ||
    lowerBranch === "master" ||
    lowerBranch.startsWith("prod") ||
    lowerBranch.startsWith("release")
  ) {
    throw new Error(`SECURITY_VIOLATION: Protected branch '${branch}' cannot be used as taskBranch.`);
  }

  if (!existsSync(join(repositoryRoot, WORKTREES_ROOT))) {
    mkdirSync(join(repositoryRoot, WORKTREES_ROOT), { recursive: true });
  }

  if (existsSync(path)) {
    // Already exists — return info
    return { taskId: safeId, path, branch, created: false, cleanedUp: false };
  }

  try {
    // Create a new branch and worktree in one step
    const result = spawnSync(
      "git",
      ["worktree", "add", "-b", branch, path, baseBranch],
      { cwd: repositoryRoot, encoding: "utf-8" }
    );

    if (result.status !== 0) {
      throw new Error(
        `git worktree add failed: ${result.stderr || result.stdout}`
      );
    }

    return { taskId: safeId, path, branch, created: true, cleanedUp: false };
  } catch (err) {
    throw new Error(`Failed to create worktree for task ${taskId}: ${err}`);
  }
}

/**
 * Clean up a worktree safely.
 * Only removes if task is complete and no uncommitted changes remain.
 */
export function removeWorktree(params: {
  taskId: string;
  repositoryRoot: string;
  force?: boolean;
}): { removed: boolean; reason: string } {
  const { taskId, repositoryRoot, force = false } = params;
  const safeId = sanitizeTaskId(taskId);
  const path = join(repositoryRoot, WORKTREES_ROOT, safeId);

  if (!existsSync(path)) {
    return { removed: false, reason: "Worktree path does not exist" };
  }

  // Check for uncommitted changes unless force
  if (!force) {
    const statusResult = spawnSync("git", ["status", "--porcelain"], {
      cwd: path,
      encoding: "utf-8",
    });
    if (statusResult.stdout.trim()) {
      return {
        removed: false,
        reason:
          "Worktree has uncommitted changes — refusing cleanup without force flag",
      };
    }
  }

  try {
    // git worktree remove first
    spawnSync("git", ["worktree", "remove", "--force", path], {
      cwd: repositoryRoot,
      encoding: "utf-8",
    });

    // Fallback filesystem removal if still present
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }

    // prune stale worktree records
    spawnSync("git", ["worktree", "prune"], {
      cwd: repositoryRoot,
      encoding: "utf-8",
    });

    return { removed: true, reason: "Cleaned up successfully" };
  } catch (err) {
    return { removed: false, reason: `Cleanup error: ${err}` };
  }
}

/**
 * List all existing agent worktrees.
 */
export function listWorktrees(repositoryRoot: string): WorktreeInfo[] {
  const result = spawnSync("git", ["worktree", "list", "--porcelain"], {
    cwd: repositoryRoot,
    encoding: "utf-8",
  });

  if (result.status !== 0) return [];

  const worktrees: WorktreeInfo[] = [];
  const blocks = result.stdout.split("\n\n");

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const pathLine = lines.find((l) => l.startsWith("worktree "));
    const branchLine = lines.find((l) => l.startsWith("branch "));

    if (pathLine && branchLine) {
      const path = pathLine.replace("worktree ", "").trim();
      const branch = branchLine.replace("branch refs/heads/", "").trim();

      if (branch.startsWith("agent-task/")) {
        const taskId = branch.replace("agent-task/", "");
        worktrees.push({
          taskId,
          path,
          branch,
          created: true,
          cleanedUp: false,
        });
      }
    }
  }

  return worktrees;
}
