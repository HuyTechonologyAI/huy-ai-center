/**
 * RESULT AUDITOR — Post-implementation review collector
 * Phase: AI-DEV-BRIDGE-A.1 (Guarded Verification & Complete Diff Parsing)
 *
 * Collects git diff, changed files (including untracked), and passes
 * summarized evidence to Antigravity for auditing.
 * Every verification command must pass through command-guard before execution.
 * Never sends secrets.
 */

import { spawnSync } from "node:child_process";
import { redact, safeJsonStringify } from "./log-redactor.js";
import { checkCommandSync } from "./command-guard.js";
import type { VerificationResult, AgentResult, AgentResultStatus } from "./types.js";

// ─────────────────────────────────────────────────
// Collect diff statistics from worktree (including untracked)
// ─────────────────────────────────────────────────

export function collectDiffStat(worktreePath: string): string {
  const diffResult = spawnSync("git", ["diff", "--stat", "HEAD"], {
    cwd: worktreePath,
    encoding: "utf-8",
  });

  const statusResult = spawnSync("git", ["status", "--porcelain"], {
    cwd: worktreePath,
    encoding: "utf-8",
  });

  let output = (diffResult.stdout ?? "").trim();

  // Parse untracked files
  const untracked = (statusResult.stdout ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("??"))
    .map((l) => l.replace(/^\?\?\s+/, ""));

  if (untracked.length > 0) {
    output += (output ? "\n\n" : "") + `Untracked files (${untracked.length}):\n` +
      untracked.map((f) => ` + ${f}`).join("\n");
  }

  return redact(output || "No changes detected").trim();
}

/**
 * Collect all changed files: modified, added, deleted, renamed, untracked.
 * Uses `git status --porcelain` to capture all filesystem modifications.
 */
export function collectChangedFiles(worktreePath: string): string[] {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: worktreePath,
    encoding: "utf-8",
  });

  if (result.status !== 0 || !result.stdout) {
    return [];
  }

  const lines = result.stdout.trim().split("\n").filter(Boolean);
  const files: string[] = [];

  for (const line of lines) {
    // Format: XY <path> or XY <oldPath> -> <newPath>
    const pathPart = line.slice(3).trim();
    if (pathPart.includes(" -> ")) {
      const parts = pathPart.split(" -> ");
      files.push(parts[1].trim());
    } else {
      files.push(pathPart);
    }
  }

  return files;
}

// ─────────────────────────────────────────────────
// Run verification commands (guarded by command-guard)
// ─────────────────────────────────────────────────

export function runVerificationCommands(params: {
  commands: string[];
  cwd: string;
  timeoutMs?: number;
}): VerificationResult[] {
  const { commands, cwd, timeoutMs = 120_000 } = params;
  const results: VerificationResult[] = [];

  for (const command of commands) {
    // Security check: Must pass command guard
    const guardDecision = checkCommandSync(command);

    if (guardDecision !== "ALLOW") {
      results.push({
        command,
        exitCode: -1,
        passed: false,
        stdout: "",
        stderr: `GUARD_BLOCKED: Verification command '${command}' rejected by policy (decision: ${guardDecision})`,
        durationMs: 0,
      });
      continue;
    }

    const [cmd, ...args] = command.split(" ");
    const start = Date.now();

    const result = spawnSync(cmd, args, {
      cwd,
      encoding: "utf-8",
      timeout: timeoutMs,
      shell: true,
    });

    const durationMs = Date.now() - start;

    results.push({
      command,
      exitCode: result.status ?? -1,
      passed: result.status === 0,
      stdout: redact(result.stdout ?? "").slice(0, 2000),
      stderr: redact(result.stderr ?? "").slice(0, 2000),
      durationMs,
    });
  }

  return results;
}

// ─────────────────────────────────────────────────
// Summarize verification results for Antigravity
// ─────────────────────────────────────────────────

export function summarizeVerification(results: VerificationResult[]): string {
  if (results.length === 0) return "No verification commands were run.";

  return results
    .map(
      (r) =>
        `[${r.passed ? "PASS" : "FAIL"}] ${r.command} (exit=${r.exitCode}, ${r.durationMs}ms)` +
        (r.stderr ? `\n  STDERR: ${r.stderr.slice(0, 200)}` : "")
    )
    .join("\n");
}

// ─────────────────────────────────────────────────
// Build agent result record
// ─────────────────────────────────────────────────

export function buildAgentResult(params: {
  taskId: string;
  planId?: string;
  cycle: number;
  status: AgentResultStatus;
  changedFiles: string[];
  diffStat: string;
  verificationResults: VerificationResult[];
  auditNotes: string;
  errorMessage?: string;
}): AgentResult {
  return {
    taskId: params.taskId,
    planId: params.planId,
    cycle: params.cycle,
    status: params.status,
    changedFiles: params.changedFiles,
    diffStat: params.diffStat,
    verificationResults: params.verificationResults,
    auditNotes: params.auditNotes,
    completedAt: new Date().toISOString(),
    errorMessage: params.errorMessage,
  };
}

// ─────────────────────────────────────────────────
// All verifications passed?
// ─────────────────────────────────────────────────

export function allVerificationsPassed(
  results: VerificationResult[]
): boolean {
  if (results.length === 0) return true;
  return results.every((r) => r.passed);
}
