/**
 * ANTIGRAVITY ADAPTER — Bridge to Antigravity CLI (agy)
 * Phase: AI-DEV-BRIDGE-A.1 (Auth States, Plan Retry & Audit Invalidation)
 *
 * Wraps `agy -p "<prompt>"` for headless planning and auditing.
 * Handles unavailability, auth failure, and retries invalid plan/audit outputs.
 */

import { spawnSync } from "node:child_process";
import { redact } from "./log-redactor.js";
import type { AgentPlan, CliCheckResult } from "./types.js";

// ─────────────────────────────────────────────────
// Pre-flight check
// ─────────────────────────────────────────────────

export function checkAntigravity(): CliCheckResult {
  const result = spawnSync("agy", ["--version"], {
    encoding: "utf-8",
    timeout: 5000,
    shell: true,
  });

  if (result.error || result.status === null || result.status !== 0) {
    return {
      name: "antigravity",
      installed: false,
      authenticated: false,
      status: "UNAVAILABLE",
    };
  }

  const version = (result.stdout || result.stderr || "").trim().split("\n")[0];

  // Do not mark authenticated = true merely because --version succeeds
  return {
    name: "antigravity",
    installed: true,
    authenticated: false,
    status: "AUTH_UNKNOWN",
    version,
  };
}

// ─────────────────────────────────────────────────
// Generate a plan using Antigravity (with 1 retry)
// ─────────────────────────────────────────────────

export interface AgyPlanRequest {
  taskId: string;
  title: string;
  objective: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
  repositoryRoot: string;
  timeoutSeconds?: number;
}

export async function generatePlan(req: AgyPlanRequest): Promise<AgentPlan> {
  const check = checkAntigravity();
  if (!check.installed) {
    return buildUnavailablePlan(req.taskId, "ANTIGRAVITY_UNAVAILABLE");
  }

  const prompt = buildPlanningPrompt(req);

  for (let attempt = 1; attempt <= 2; attempt++) {
    // Feed the prompt through stdin instead of the shell command line.
    // This avoids Windows cmd.exe quoting/multiline corruption while keeping
    // compatibility with the npm-installed agy shim.
    const result = spawnSync(
      "agy",
      ["--print", "--input-format", "text", "--output-format", "text"],
      {
        input: prompt,
        encoding: "utf-8",
        cwd: req.repositoryRoot,
        timeout: (req.timeoutSeconds ?? 120) * 1000,
        env: { ...process.env },
        shell: true,
      }
    );

    const stdout = redact(result.stdout ?? "");
    const stderr = redact(result.stderr ?? "");
    const output = stdout || stderr;

    if (isAgyAuthError(output)) {
      return buildUnavailablePlan(req.taskId, "HUMAN_AUTH_REQUIRED");
    }

    if (result.status === 0 && output) {
      const plan = parsePlanOutput(req.taskId, output);
      if (plan.steps.length > 0) {
        return plan;
      }
    }

    console.warn(`[antigravity-adapter] Plan attempt ${attempt} invalid or empty. Retrying...`);
  }

  return buildUnavailablePlan(req.taskId, "AGENT_PLAN_INVALID");
}

// ─────────────────────────────────────────────────
// Audit a Codex result using Antigravity (with 1 retry)
// ─────────────────────────────────────────────────

export interface AgyAuditRequest {
  taskId: string;
  objective: string;
  diffStat: string;
  verificationSummary: string;
  repositoryRoot: string;
  timeoutSeconds?: number;
}

export async function auditResult(
  req: AgyAuditRequest
): Promise<
  | "PASS"
  | "CORRECTION_REQUIRED"
  | "HUMAN_DECISION_REQUIRED"
  | "ANTIGRAVITY_UNAVAILABLE"
  | "HUMAN_AUTH_REQUIRED"
  | "AUDIT_INVALID"
> {
  const check = checkAntigravity();
  if (!check.installed) return "ANTIGRAVITY_UNAVAILABLE";

  const prompt = `
You are auditing a completed automation task.

Task ID: ${req.taskId}
Objective: ${req.objective}

Git diff stat:
${redact(req.diffStat)}

Verification results:
${req.verificationSummary}

Based on the above, respond with ONE of the following (nothing else):
PASS
CORRECTION_REQUIRED
HUMAN_DECISION_REQUIRED

PASS = the implementation meets the objective and all verifications pass.
CORRECTION_REQUIRED = the implementation has issues that can be fixed automatically.
HUMAN_DECISION_REQUIRED = there is an architectural or security ambiguity a human must resolve.
`.trim();

  for (let attempt = 1; attempt <= 2; attempt++) {
    // Use stdin for the audit prompt as well so Windows shell parsing cannot
    // alter multiline content or punctuation in the prompt.
    const result = spawnSync(
      "agy",
      ["--print", "--input-format", "text", "--output-format", "text"],
      {
        input: prompt,
        encoding: "utf-8",
        cwd: req.repositoryRoot,
        timeout: (req.timeoutSeconds ?? 90) * 1000,
        env: { ...process.env },
        shell: true,
      }
    );

    const output = redact(result.stdout ?? "").trim().toUpperCase();

    if (isAgyAuthError(output)) {
      return "HUMAN_AUTH_REQUIRED";
    }

    if (output.includes("CORRECTION_REQUIRED")) return "CORRECTION_REQUIRED";
    if (output.includes("HUMAN_DECISION_REQUIRED")) return "HUMAN_DECISION_REQUIRED";
    if (output.includes("PASS")) return "PASS";

    console.warn(`[antigravity-adapter] Audit attempt ${attempt} returned unrecognized response: ${output.slice(0, 100)}`);
  }

  // Do not silently convert malformed agent output to PASS
  return "AUDIT_INVALID";
}

function isAgyAuthError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("unauthenticated") ||
    lower.includes("please login") ||
    lower.includes("login required") ||
    lower.includes("not logged in") ||
    lower.includes("invalid api key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("authentication failed") ||
    lower.includes("auth error")
  );
}

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

function buildPlanningPrompt(req: AgyPlanRequest): string {
  return `
You are an AI planner for an automated engineering bridge.

Task ID: ${req.taskId}
Title: ${req.title}
Objective: ${req.objective}

Allowed paths: ${req.allowedPaths.join(", ") || "any"}
Forbidden paths: ${req.forbiddenPaths.join(", ") || "none"}

Generate a numbered step-by-step implementation plan.
Each step must reference target files (if applicable).
Keep steps concrete, minimal, and reversible.
Respond in plain text with numbered steps only.
`.trim();
}

function parsePlanOutput(taskId: string, output: string): AgentPlan {
  const lines = output.split("\n").filter((l) => l.trim());
  const steps = lines
    .filter((l) => /^\d+\./.test(l.trim()))
    .map((l, i) => ({
      stepIndex: i + 1,
      description: l.replace(/^\d+\.\s*/, "").trim(),
      riskEstimate: "R1" as const,
    }));

  return {
    planId: `plan-${taskId}-${Date.now()}`,
    taskId,
    model: "agy",
    generatedAt: new Date().toISOString(),
    steps: steps.length > 0 ? steps : [
      { stepIndex: 1, description: output.slice(0, 500), riskEstimate: "R1" },
    ],
    requiredTools: ["agy", "codex"],
    approvedByGate: false,
    rawOutput: output,
  };
}

function buildUnavailablePlan(taskId: string, reason: string): AgentPlan {
  return {
    planId: `plan-${taskId}-${reason.toLowerCase()}`,
    taskId,
    model: "unavailable",
    generatedAt: new Date().toISOString(),
    steps: [],
    requiredTools: [],
    approvedByGate: false,
    rawOutput: reason,
  };
}
