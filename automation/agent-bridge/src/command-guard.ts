/**
 * COMMAND GUARD — Pre-execution safety check
 * Phase: AI-DEV-BRIDGE-A
 *
 * Every command proposed for automatic execution passes through here.
 * Returns ALLOW / DENY / HUMAN_REQUIRED based on static policy.
 */

import type {
  CommandGuardRequest,
  CommandGuardResult,
} from "./types.js";
import { classifyCommand, classifyTask, isAutomatic, requiresHuman } from "./risk-classifier.js";
import { loadAutonomyPolicy } from "./approval-gate.js";

export async function checkCommand(
  req: CommandGuardRequest
): Promise<CommandGuardResult> {
  const policy = await loadAutonomyPolicy();

  // Classify using static policy (deterministic)
  const staticClass = classifyCommand(req.command);

  // Task-level environment override
  const taskClass = classifyTask({
    targetBranch: req.targetBranch,
    targetEnvironment: req.targetEnvironment,
    actionDescription: req.command,
    modelSuggested: req.modelSuggestedRisk,
  });

  // effective_risk = MAX(static, task-level, model_suggested)
  const effectiveRisk = taskClass.effectiveLevel;
  const riskPolicy = policy[effectiveRisk];

  if (riskPolicy.approval === "AUTO") {
    return {
      decision: "ALLOW",
      effectiveRisk,
      reason: `Risk ${effectiveRisk} → AUTO (${staticClass.reason})`,
      matchedPattern: staticClass.matchedPattern,
    };
  }

  if (riskPolicy.approval === "HUMAN_REQUIRED") {
    return {
      decision: "HUMAN_REQUIRED",
      effectiveRisk,
      reason: `Risk ${effectiveRisk} → HUMAN_REQUIRED (${staticClass.reason})`,
      matchedPattern: staticClass.matchedPattern,
    };
  }

  // HUMAN_OWNER_REQUIRED
  return {
    decision: "HUMAN_REQUIRED",
    effectiveRisk,
    reason: `Risk ${effectiveRisk} → HUMAN_OWNER_REQUIRED (${staticClass.reason})`,
    matchedPattern: staticClass.matchedPattern,
  };
}

/**
 * Synchronous guard used inside tight loops where async not available.
 * Uses in-process cached policy.
 */
export function checkCommandSync(
  command: string,
  targetBranch?: string
): "ALLOW" | "DENY" | "HUMAN_REQUIRED" {
  const staticClass = classifyCommand(command);

  // Direct-to-main is always R3
  if (
    targetBranch === "main" ||
    /git\s+push\s+.*origin\s+main/i.test(command) ||
    /git\s+push\s+.*(-f\b|--force\b)/i.test(command)
  ) {
    return "HUMAN_REQUIRED";
  }

  if (requiresHuman(staticClass.risk)) {
    return "HUMAN_REQUIRED";
  }

  if (isAutomatic(staticClass.risk)) {
    return "ALLOW";
  }

  return "DENY";
}
