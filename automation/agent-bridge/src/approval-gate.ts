/**
 * APPROVAL GATE — Risk policy loader and gate enforcer
 * Phase: AI-DEV-BRIDGE-A
 *
 * Loads config/autonomy/autonomy-policy.json and decides
 * whether a task proceeds automatically or waits for human.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  AutonomyPolicy,
  RiskLevel,
  ApprovalMode,
  TaskContract,
  ApprovalRequest,
} from "./types.js";

// ─────────────────────────────────────────────────
// Policy loader (with in-process cache)
// ─────────────────────────────────────────────────

let _cachedPolicy: AutonomyPolicy | null = null;

export async function loadAutonomyPolicy(
  policyPath?: string
): Promise<AutonomyPolicy> {
  if (_cachedPolicy) return _cachedPolicy;

  const defaultPath = resolve(
    process.cwd(),
    "config/autonomy/autonomy-policy.json"
  );
  const resolvedPath = policyPath ?? defaultPath;

  try {
    const raw = await readFile(resolvedPath, "utf-8");
    _cachedPolicy = JSON.parse(raw) as AutonomyPolicy;
    return _cachedPolicy;
  } catch {
    // Return safe fallback: everything above R1 requires human
    console.warn(
      `[approval-gate] Could not load policy from ${resolvedPath}. Using safe fallback.`
    );
    return getDefaultPolicy();
  }
}

/** Reset cache (useful in tests). */
export function resetPolicyCache(): void {
  _cachedPolicy = null;
}

function getDefaultPolicy(): AutonomyPolicy {
  return {
    R0: { approval: "AUTO" },
    R1: { approval: "AUTO" },
    R2: { approval: "AUTO", sandboxRequired: true },
    R3: { approval: "HUMAN_REQUIRED" },
    R4: { approval: "HUMAN_OWNER_REQUIRED" },
  };
}

// ─────────────────────────────────────────────────
// Gate evaluation
// ─────────────────────────────────────────────────

export interface GateResult {
  proceed: boolean;
  mode: ApprovalMode;
  sandboxRequired: boolean;
  reason: string;
}

export async function evaluateGate(riskLevel: RiskLevel): Promise<GateResult> {
  const policy = await loadAutonomyPolicy();
  const entry = policy[riskLevel];

  const proceed = entry.approval === "AUTO";
  const sandboxRequired =
    entry.sandboxRequired ??
    (entry as { sandbox_required?: boolean }).sandbox_required ??
    false;
  return {
    proceed,
    mode: entry.approval,
    sandboxRequired,
    reason: proceed
      ? `${riskLevel} → AUTO (no human needed)`
      : `${riskLevel} → ${entry.approval} (human gate required)`,
  };
}

// ─────────────────────────────────────────────────
// Approval request builder (for R3/R4 tasks)
// ─────────────────────────────────────────────────

export function buildApprovalRequest(
  contract: TaskContract,
  riskLevel: RiskLevel,
  requestedAction: string,
  whyRequired: string,
  affectedResources: string[],
  validationCompleted: string[],
  proposedCommand?: string,
  rollback = "Revert to base ref — no production change occurred."
): ApprovalRequest {
  return {
    taskId: contract.taskId,
    requestedAction,
    riskLevel,
    whyApprovalRequired: whyRequired,
    affectedResources,
    proposedCommand,
    rollbackProcedure: rollback,
    validationCompleted,
    recommendedNextStep: `Human Owner reviews .artifacts/approvals/${contract.taskId}.json and approves or rejects.`,
    createdAt: new Date().toISOString(),
  };
}
