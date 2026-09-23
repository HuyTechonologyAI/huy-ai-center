/**
 * CODEX ADAPTER — Bridge to OpenAI Codex CLI
 * Phase: AI-DEV-BRIDGE-A
 *
 * Wraps `codex exec --sandbox workspace-write` for implementation.
 * Handles unavailability and auth failure gracefully.
 * NEVER uses danger-full-access.
 */

import { spawnSync } from "node:child_process";
import { redact } from "./log-redactor.js";
import type { CliCheckResult } from "./types.js";

// ─────────────────────────────────────────────────
// Pre-flight check
// ─────────────────────────────────────────────────

export function checkCodex(): CliCheckResult {
  const result = spawnSync("codex", ["--version"], {
    encoding: "utf-8",
    timeout: 5000,
  });

  if (result.error || result.status === null) {
    return {
      name: "codex",
      installed: false,
      authenticated: false,
      status: "UNAVAILABLE",
    };
  }

  const version = (result.stdout || "").trim().split("\n")[0];

  // Check for auth: `codex --version` without auth may return non-zero or auth prompt
  // We consider it ready if exit code 0
  if (result.status === 0) {
    return {
      name: "codex",
      installed: true,
      authenticated: true,
      status: "READY",
      version,
    };
  }

  // Non-zero exit on --version typically means auth issue
  const errOutput = redact(result.stderr ?? "");
  if (
    errOutput.toLowerCase().includes("auth") ||
    errOutput.toLowerCase().includes("login") ||
    errOutput.toLowerCase().includes("api key")
  ) {
    return {
      name: "codex",
      installed: true,
      authenticated: false,
      status: "HUMAN_AUTH_REQUIRED",
      version: undefined,
    };
  }

  return {
    name: "codex",
    installed: true,
    authenticated: false,
    status: "UNAVAILABLE",
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
  blockReason?: string;
}

export async function execCodexTask(
  req: CodexExecRequest
): Promise<CodexExecResult> {
  const check = checkCodex();

  if (!check.installed) {
    return {
      success: false,
      stdout: "",
      stderr: "CODEX_UNAVAILABLE",
      exitCode: null,
      blocked: true,
      blockReason: "CODEX_UNAVAILABLE",
    };
  }

  if (check.status === "HUMAN_AUTH_REQUIRED") {
    return {
      success: false,
      stdout: "",
      stderr: "HUMAN_AUTH_REQUIRED — Codex requires authentication",
      exitCode: null,
      blocked: true,
      blockReason: "HUMAN_AUTH_REQUIRED",
    };
  }

  // Build the codex exec command
  // NEVER use danger-full-access
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
  });

  return {
    success: (result.status ?? 1) === 0,
    stdout: redact(result.stdout ?? ""),
    stderr: redact(result.stderr ?? ""),
    exitCode: result.status,
    blocked: false,
  };
}

// ─────────────────────────────────────────────────
// Build implementation prompt from approved plan
// ─────────────────────────────────────────────────

export function buildImplementationPrompt(params: {
  taskId: string;
  objective: string;
  planSteps: Array<{ stepIndex: number; description: string }>;
  allowedPaths: string[];
  forbiddenPaths: string[];
}): string {
  const { taskId, objective, planSteps, allowedPaths, forbiddenPaths } = params;

  const stepsText = planSteps
    .map((s) => `${s.stepIndex}. ${s.description}`)
    .join("\n");

  const allowedText = allowedPaths.length
    ? `Allowed paths: ${allowedPaths.join(", ")}`
    : "No path restrictions within the worktree.";

  const forbiddenText = forbiddenPaths.length
    ? `FORBIDDEN paths (do NOT touch): ${forbiddenPaths.join(", ")}`
    : "";

  return `
Task ID: ${taskId}

Objective:
${objective}

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
