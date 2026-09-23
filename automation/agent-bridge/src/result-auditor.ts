/**
 * RESULT AUDITOR — Post-implementation review collector
 * Phase: AI-DEV-BRIDGE-A
 *
 * Collects git diff, verification results, and passes
 * summarized evidence to Antigravity for auditing.
 * Never sends secrets.
 */

import { spawnSync } from "node:child_process";
import { redact, safeJsonStringify } from "./log-redactor.js";
import type { VerificationResult, AgentResult, AgentResultStatus } from "./types.js";

// ─────────────────────────────────────────────────
// Collect diff statistics from worktree
// ─────────────────────────────────────────────────

export function collectDiffStat(worktreePath: string): string {
  const result = spawnSync("git", ["diff", "--stat", "HEAD"], {
    cwd: worktreePath,
    encoding: "utf-8",
  });
  return redact(result.stdout ?? "").trim();
}

export function collectChangedFiles(worktreePath: string): string[] {
  const result = spawnSync(
    "git",
    ["diff", "--name-only", "HEAD"],
    { cwd: worktreePath, encoding: "utf-8" }
  );
  return (result.stdout ?? "")
    .trim()
    .split("\n")
    .filter(Boolean);
}

// ─────────────────────────────────────────────────
// Run verification commands
// ─────────────────────────────────────────────────

export function runVerificationCommands(params: {
  commands: string[];
  cwd: string;
  timeoutMs?: number;
}): VerificationResult[] {
  const { commands, cwd, timeoutMs = 120_000 } = params;
  const results: VerificationResult[] = [];

  for (const command of commands) {
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
