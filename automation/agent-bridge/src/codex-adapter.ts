/**
 * CODEX ADAPTER — Bridge to OpenAI Codex CLI
 * Phase: AI-DEV-BRIDGE-A.1 (Auth States, Explicit Error Mapping & Self-Correction)
 *
 * Wraps `codex exec --sandbox workspace-write` for implementation.
 * Handles unavailability, auth failure, sandbox violation, and timeout gracefully.
 * NEVER uses danger-full-access.
 */

import { spawnSync } from "node:child_process";
import { redact } from "./log-redactor.js";
import type { CliCheckResult, CliStatus } from "./types.js";

// ─────────────────────────────────────────────────
// Pre-flight check
// ─────────────────────────────────────────────────

export function checkCodex(): CliCheckResult {
  const result = spawnSync("codex", ["--version"], {
    encoding: "utf-8",
    timeout: 5000,
    shell: true,
  });

  if (result.error || result.status === null || result.status !== 0) {
    return {
      name: "codex",
      installed: false,
      authenticated: false,
      status: "UNAVAILABLE",
    };
  }

  const version = (result.stdout || "").trim().split("\n")[0];

  // Do not assume authenticated = true merely because --version succeeds
  return {
    name: "codex",
    installed: true,
    authenticated: false,
    status: "AUTH_UNKNOWN",
    version,
  };
}

// ─────────────────────────────────────────────────
// Execute a task via Codex
// ─────────────────────────────────────────────────

export interface CodexExecRequest {
  taskId: string;
  prompt: string;
  worktreePath: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
  timeoutSeconds?: number;
}

export interface CodexExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  blocked: boolean;
  blockReason?:
    | "CODEX_UNAVAILABLE"
    | "HUMAN_AUTH_REQUIRED"
    | "SANDBOX_VIOLATION"
    | "PERMISSION_DENIED"
    | "EXECUTION_TIMEOUT"
    | "IMPLEMENTATION_FAILED";
}

export async function execCodexTask(
  req: CodexExecRequest
): Promise<CodexExecResult> {
  const check = checkCodex();

  if (!check.installed) {
    return {
      success: false,
      stdout: "",
      stderr: "CODEX_UNAVAILABLE: Codex CLI not found in PATH",
      exitCode: null,
      blocked: true,
      blockReason: "CODEX_UNAVAILABLE",
    };
  }

  // Build the codex exec command
  // ALWAYS enforce workspace-write sandbox — NEVER danger-full-access
  const args = [
    "exec",
    "--sandbox", "workspace-write",
    "--ephemeral",
    req.prompt,
  ];

  const result = spawnSync("codex", args, {
    encoding: "utf-8",
    cwd: req.worktreePath,
    timeout: (req.timeoutSeconds ?? 1800) * 1000,
    env: { ...process.env },
    shell: true,
  });

  const stdout = redact(result.stdout ?? "");
  const stderr = redact(result.stderr ?? "");
  const combined = `${stdout}\n${stderr}`.toLowerCase();

  // Check for timeout
  if (result.error && (result.error as { code?: string }).code === "ETIMEDOUT") {
    return {
      success: false,
      stdout,
      stderr: "EXECUTION_TIMEOUT: Codex task exceeded configured timeout",
      exitCode: result.status,
      blocked: true,
      blockReason: "EXECUTION_TIMEOUT",
    };
  }

  // Check for authentication error
  if (isCodexAuthError(combined)) {
    return {
      success: false,
      stdout,
      stderr: "HUMAN_AUTH_REQUIRED: Codex CLI requires human authentication",
      exitCode: result.status,
      blocked: true,
      blockReason: "HUMAN_AUTH_REQUIRED",
    };
  }

  // Check for sandbox denial
  if (combined.includes("sandbox") && (combined.includes("denied") || combined.includes("violation") || combined.includes("blocked"))) {
    return {
      success: false,
      stdout,
      stderr: "SANDBOX_VIOLATION: Operation denied by workspace-write sandbox",
      exitCode: result.status,
      blocked: true,
      blockReason: "SANDBOX_VIOLATION",
    };
  }

  // Check for permission failure
  if (combined.includes("permission denied") || combined.includes("eacces")) {
    return {
      success: false,
      stdout,
      stderr: "PERMISSION_DENIED: File or process permission denied",
      exitCode: result.status,
      blocked: true,
      blockReason: "PERMISSION_DENIED",
    };
  }

  const isSuccess = (result.status ?? 1) === 0;

  return {
    success: isSuccess,
    stdout,
    stderr,
    exitCode: result.status,
    blocked: !isSuccess,
    blockReason: isSuccess ? undefined : "IMPLEMENTATION_FAILED",
  };
}

function isCodexAuthError(text: string): boolean {
  return (
    text.includes("unauthenticated") ||
    text.includes("please login") ||
    text.includes("login required") ||
    text.includes("not logged in") ||
    text.includes("invalid api key") ||
    text.includes("api_key_invalid") ||
    text.includes("authentication failed") ||
    text.includes("auth error")
  );
}

// ─────────────────────────────────────────────────
// Build implementation prompt (with real self-correction context)
// ─────────────────────────────────────────────────

export function buildImplementationPrompt(params: {
  taskId: string;
  objective: string;
  planSteps: Array<{ stepIndex: number; description: string }>;
  allowedPaths: string[];
  forbiddenPaths: string[];
  cycle?: number;
  maxCycles?: number;
  previousDiffSummary?: string;
  failedVerifications?: string;
  auditorFeedback?: string;
  scopeViolation?: string;
}): string {
  const {
    taskId,
    objective,
    planSteps,
    allowedPaths,
    forbiddenPaths,
    cycle = 1,
    maxCycles = 3,
    previousDiffSummary,
    failedVerifications,
    auditorFeedback,
    scopeViolation,
  } = params;

  const stepsText = planSteps
    .map((s) => `${s.stepIndex}. ${s.description}`)
    .join("\n");

  const allowedText = allowedPaths.length
    ? `Allowed paths: ${allowedPaths.join(", ")}`
    : "No path restrictions within the worktree.";

  const forbiddenText = forbiddenPaths.length
    ? `FORBIDDEN paths (do NOT touch): ${forbiddenPaths.join(", ")}`
    : "";

  let correctionSection = "";
  if (cycle > 1) {
    correctionSection = `
=== SELF-CORRECTION ATTEMPT (CYCLE ${cycle}/${maxCycles}) ===
The previous implementation attempt requires corrections. Please address these specific issues:

${scopeViolation ? `[SCOPE VIOLATION DETECTED]\n${scopeViolation}\nDo NOT touch files outside allowedPaths!\n` : ""}
${failedVerifications ? `[FAILED VERIFICATION COMMANDS]\n${failedVerifications}\n` : ""}
${auditorFeedback ? `[AUDITOR FEEDBACK]\n${auditorFeedback}\n` : ""}
${previousDiffSummary ? `[PREVIOUS MODIFICATIONS SUMMARY]\n${previousDiffSummary}\n` : ""}
Please resolve all reported failures and strictly remain within scope.
=============================================================
`;
  }

  return `
Task ID: ${taskId}

Objective:
${objective}
${correctionSection}
Implementation plan (approved):
${stepsText}

Scope constraints:
${allowedText}
${forbiddenText}

Rules:
- Do not modify files outside the allowed paths.
- Do not touch production database, environment files, or secrets.
- Write clean, typed TypeScript where applicable.
- Ensure existing tests still pass after your changes.
- Do not commit — the bridge handles commits separately.
`.trim();
}
