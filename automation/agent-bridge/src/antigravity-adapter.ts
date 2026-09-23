/**
 * ANTIGRAVITY ADAPTER — Bridge to Antigravity CLI (agy)
 * Phase: AI-DEV-BRIDGE-A
 *
 * Wraps `agy -p "<prompt>"` for headless planning and auditing.
 * Handles unavailability and auth failure gracefully.
 */

import { spawnSync } from "node:child_process";
import { redact } from "./log-redactor.js";
import type { AgentPlan, AgentResult, AgentResultStatus, CliCheckResult } from "./types.js";

// ─────────────────────────────────────────────────
// Pre-flight check
// ─────────────────────────────────────────────────

export function checkAntigravity(): CliCheckResult {
  const result = spawnSync("agy", ["--version"], {
    encoding: "utf-8",
    timeout: 5000,
  });

  if (result.error || result.status === null) {
    return {
      name: "antigravity",
      installed: false,
      authenticated: false,
      status: "UNAVAILABLE",
    };
  }

  const version = (result.stdout || result.stderr || "").trim().split("\n")[0];

  // Auth check: if agy requires login it typically prints an auth error
  // We do a quick --version pass which should be auth-free
  return {
    name: "antigravity",
    installed: true,
    authenticated: true, // agy --version doesn't require auth
    status: "READY",
    version,
  };
}

// ─────────────────────────────────────────────────
// Generate a plan using Antigravity
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

  const result = spawnSync("agy", ["-p", prompt, "--output-format", "text"], {
    encoding: "utf-8",
    cwd: req.repositoryRoot,
    timeout: (req.timeoutSeconds ?? 120) * 1000,
    env: { ...process.env },
  });

  const stdout = redact(result.stdout ?? "");
  const stderr = redact(result.stderr ?? "");
  const output = stdout || stderr;

  if (result.status !== 0 || !output) {
    console.warn(
      `[antigravity-adapter] agy returned status=${result.status}. Output: ${output.slice(0, 300)}`
    );
    return buildUnavailablePlan(req.taskId, "AGENT_PLAN_INVALID");
  }

  return parsePlanOutput(req.taskId, output);
}

// ─────────────────────────────────────────────────
// Audit a Codex result using Antigravity
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
): Promise<"PASS" | "CORRECTION_REQUIRED" | "HUMAN_DECISION_REQUIRED" | "ANTIGRAVITY_UNAVAILABLE"> {
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

  const result = spawnSync(
    "agy",
    ["-p", prompt, "--output-format", "text"],
    {
      encoding: "utf-8",
      cwd: req.repositoryRoot,
      timeout: (req.timeoutSeconds ?? 90) * 1000,
    }
  );

  const output = redact(result.stdout ?? "").trim().toUpperCase();

  if (output.includes("CORRECTION_REQUIRED")) return "CORRECTION_REQUIRED";
  if (output.includes("HUMAN_DECISION_REQUIRED")) return "HUMAN_DECISION_REQUIRED";
  if (output.includes("PASS")) return "PASS";

  // Unknown response — escalate
  console.warn(`[antigravity-adapter] Unexpected audit response: ${output.slice(0, 200)}`);
  return "CORRECTION_REQUIRED";
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
    planId: `plan-${taskId}-unavailable`,
    taskId,
    model: "unavailable",
    generatedAt: new Date().toISOString(),
    steps: [],
    requiredTools: [],
    approvedByGate: false,
    rawOutput: reason,
  };
}
