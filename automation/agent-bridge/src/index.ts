/**
 * INDEX — Codex × Antigravity Automation Bridge Entry Point
 * Phase: AI-DEV-BRIDGE-A
 *
 * Public API for the bridge. Exposes:
 *  - runTask()        Run a full task contract
 *  - preflight()      Check all required CLIs
 *  - validateContract() Validate a task JSON file
 */

export { runTask } from "./task-runner.js";
export { checkAntigravity, generatePlan, auditResult } from "./antigravity-adapter.js";
export { checkCodex, execCodexTask } from "./codex-adapter.js";
export { checkCommand, checkCommandSync } from "./command-guard.js";
export { evaluateGate, loadAutonomyPolicy } from "./approval-gate.js";
export { classifyTask, classifyCommand, maxRisk, isAutomatic, requiresHuman } from "./risk-classifier.js";
export { redact, redactObject, isSensitiveKey, safeJsonStringify } from "./log-redactor.js";
export { createWorktree, removeWorktree, listWorktrees } from "./worktree-manager.js";
export * from "./types.js";

import { checkAntigravity } from "./antigravity-adapter.js";
import { checkCodex } from "./codex-adapter.js";
import type { CliCheckResult } from "./types.js";

// ─────────────────────────────────────────────────
// Pre-flight
// ─────────────────────────────────────────────────

export interface PreflightReport {
  git: { installed: boolean; version: string };
  node: { installed: boolean; version: string };
  npm: { installed: boolean; version: string };
  agy: CliCheckResult;
  codex: CliCheckResult;
  gh: { installed: boolean; version?: string };
  ready: boolean;
  missingRequired: string[];
}

import { spawnSync } from "node:child_process";

export function preflight(): PreflightReport {
  function checkCli(cmd: string, args: string[] = ["--version"]): { installed: boolean; version?: string } {
    const r = spawnSync(cmd, args, { encoding: "utf-8", timeout: 5000, shell: true });
    if (r.error || r.status === null || r.status !== 0) return { installed: false };
    return {
      installed: true,
      version: (r.stdout || r.stderr || "").trim().split("\n")[0],
    };
  }

  const git = checkCli("git", ["--version"]);
  const node = checkCli("node", ["--version"]);
  const npm = checkCli("npm", ["--version"]);
  const agy = checkAntigravity();
  const codex = checkCodex();
  const gh = checkCli("gh", ["--version"]);

  const missingRequired: string[] = [];
  if (!git.installed) missingRequired.push("git");
  if (!node.installed) missingRequired.push("node");
  if (!npm.installed) missingRequired.push("npm");
  // agy and codex are optional — bridge degrades gracefully

  return {
    git: { installed: git.installed, version: git.version ?? "NOT_FOUND" },
    node: { installed: node.installed, version: node.version ?? "NOT_FOUND" },
    npm: { installed: npm.installed, version: npm.version ?? "NOT_FOUND" },
    agy,
    codex,
    gh: { installed: gh.installed, version: gh.version },
    ready: missingRequired.length === 0,
    missingRequired,
  };
}

// ─────────────────────────────────────────────────
// Task contract validator
// ─────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import type { TaskContract } from "./types.js";

export function validateContract(pathOrObject: string | unknown): {
  valid: boolean;
  contract?: TaskContract;
  errors: string[];
} {
  let raw: unknown;
  const errors: string[] = [];

  if (typeof pathOrObject === "string") {
    try {
      raw = JSON.parse(readFileSync(pathOrObject, "utf-8"));
    } catch (e) {
      return { valid: false, errors: [`Cannot read/parse file: ${e}`] };
    }
  } else {
    raw = pathOrObject;
  }

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Contract must be a JSON object"] };
  }

  const c = raw as Record<string, unknown>;

  if (!c["taskId"] || typeof c["taskId"] !== "string")
    errors.push("Missing required field: taskId (string)");
  if (!c["title"] || typeof c["title"] !== "string")
    errors.push("Missing required field: title (string)");
  if (!c["objective"] || typeof c["objective"] !== "string")
    errors.push("Missing required field: objective (string)");
  if (!c["repository"] || typeof c["repository"] !== "object")
    errors.push("Missing required field: repository (object)");
  if (!c["scope"] || typeof c["scope"] !== "object")
    errors.push("Missing required field: scope (object)");
  if (!c["risk"] || typeof c["risk"] !== "object")
    errors.push("Missing required field: risk (object)");
  if (!c["execution"] || typeof c["execution"] !== "object")
    errors.push("Missing required field: execution (object)");
  if (!c["verification"] || typeof c["verification"] !== "object")
    errors.push("Missing required field: verification (object)");
  if (!c["sourceControl"] || typeof c["sourceControl"] !== "object")
    errors.push("Missing required field: sourceControl (object)");

  // Validate merge is always false
  const sc = c["sourceControl"] as Record<string, unknown> | undefined;
  if (sc && sc["mergeAllowed"] !== false) {
    errors.push("sourceControl.mergeAllowed MUST be false — merge is always R3/HUMAN");
  }

  // Validate taskBranch does not target protected branches
  const repo = c["repository"] as Record<string, unknown> | undefined;
  if (repo && typeof repo["taskBranch"] === "string") {
    const lowerBranch = (repo["taskBranch"] as string).toLowerCase().trim();
    if (
      lowerBranch === "main" ||
      lowerBranch === "master" ||
      lowerBranch.startsWith("prod") ||
      lowerBranch.startsWith("release") ||
      lowerBranch.includes("--force")
    ) {
      errors.push(`repository.taskBranch cannot target protected ref '${repo["taskBranch"]}'`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, contract: raw as TaskContract, errors: [] };
}
