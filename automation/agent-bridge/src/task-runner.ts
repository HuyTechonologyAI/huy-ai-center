/**
 * TASK RUNNER — Core execution loop
 * Phase: AI-DEV-BRIDGE-A.1 (Scope Enforcement, Safe Staging & Real Self-Correction)
 *
 * Orchestrates: Contract → Risk → Plan → Gate → Impl → Scope Check → Verify → Audit → Safe Commit
 * Maximum 3 self-correction cycles with real error feedback.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import type {
  TaskContract,
  BridgeTaskState,
  AgentResultStatus,
} from "./types.js";
import { classifyTask, maxRisk, requiresHuman } from "./risk-classifier.js";
import { evaluateGate, buildApprovalRequest } from "./approval-gate.js";
import { generatePlan, auditResult } from "./antigravity-adapter.js";
import {
  checkCodex,
  execCodexTask,
  buildImplementationPrompt,
} from "./codex-adapter.js";
import { createWorktree } from "./worktree-manager.js";
import {
  collectDiffStat,
  collectChangedFiles,
  runVerificationCommands,
  summarizeVerification,
  buildAgentResult,
  allVerificationsPassed,
} from "./result-auditor.js";
import { safeJsonStringify } from "./log-redactor.js";

const ARTIFACTS_ROOT = ".artifacts/agent-bridge";
const MAX_CYCLES = 3;

// ─────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────

export async function runTask(
  contract: TaskContract,
  repositoryRoot: string
): Promise<BridgeTaskState> {
  const state: BridgeTaskState = {
    contract,
    status: "PENDING",
    cycles: 0,
  };

  const artifactDir = join(repositoryRoot, ARTIFACTS_ROOT, contract.taskId);
  ensureDir(artifactDir);

  // ── 1. Static risk assessment (deterministic, fail-closed) ─────
  state.status = "RISK_ASSESSED";
  const riskAssessment = classifyTask({
    targetBranch: contract.repository.taskBranch,
    targetEnvironment: "feature",
    actionDescription: contract.objective,
    modelSuggested: contract.risk.level,
  });
  state.risk = riskAssessment;

  writeArtifact(artifactDir, "risk.json", riskAssessment);

  // ── 2. Gate check (R0-R2: AUTO, R3-R4: HUMAN_GATE) ────────────
  const gate = await evaluateGate(riskAssessment.effectiveLevel);

  if (!gate.proceed) {
    state.status = "HUMAN_GATE";
    const approvalReq = buildApprovalRequest(
      contract,
      riskAssessment.effectiveLevel,
      contract.objective,
      gate.reason,
      contract.scope.allowedPaths,
      [],
      undefined,
      "Revert to base ref — no production change occurred."
    );
    state.approvalRequest = approvalReq;
    writeApprovalRequest(repositoryRoot, approvalReq);
    writeArtifact(artifactDir, "audit.json", {
      status: "HUMAN_GATE",
      gate,
      approvalRequest: approvalReq,
    });
    console.log(`[task-runner] Task ${contract.taskId} → HUMAN_GATE (${gate.reason})`);
    return state;
  }

  // ── 3. Planning (Antigravity with retry) ────────────────────────
  state.status = "PLANNING";

  const plan = await generatePlan({
    taskId: contract.taskId,
    title: contract.title,
    objective: contract.objective,
    allowedPaths: contract.scope.allowedPaths,
    forbiddenPaths: contract.scope.forbiddenPaths,
    repositoryRoot,
    timeoutSeconds: 120,
  });

  state.plan = { ...plan, approvedByGate: true };
  writeArtifact(artifactDir, "plan.json", plan);

  if (plan.rawOutput === "HUMAN_AUTH_REQUIRED") {
    state.status = "HUMAN_GATE";
    writeArtifact(artifactDir, "audit.json", {
      finalStatus: "HUMAN_AUTH_REQUIRED",
      reason: "Antigravity CLI requires human authentication",
    });
    return state;
  }

  if (plan.rawOutput === "AGENT_PLAN_INVALID") {
    state.status = "FAILED";
    writeArtifact(artifactDir, "audit.json", {
      finalStatus: "AGENT_PLAN_INVALID",
      reason: "Antigravity generated an invalid plan after retry",
    });
    return state;
  }

  // ── 4. Worktree isolation (taskBranch authoritative) ───────────
  const worktree = createWorktree({
    taskId: contract.taskId,
    baseBranch: contract.repository.baseRef,
    repositoryRoot,
    taskBranch: contract.repository.taskBranch,
  });
  state.worktree = worktree;

  // ── 5. Self-correction implementation loop ─────────────────────
  let lastStatus: AgentResultStatus = "PENDING" as AgentResultStatus;
  let previousDiffSummary = "";
  let failedVerifications = "";
  let auditorFeedback = "";
  let scopeViolationNotes = "";

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    state.cycles = cycle;
    state.status = "IMPLEMENTING";

    console.log(`[task-runner] Task ${contract.taskId} → cycle ${cycle}/${MAX_CYCLES}`);

    // Check Codex availability
    const codexCheck = checkCodex();

    if (codexCheck.status === "UNAVAILABLE") {
      console.warn(`[task-runner] Codex unavailable (${codexCheck.status}) — skipping impl step`);
      lastStatus = "CODEX_UNAVAILABLE";
      break;
    }

    if (codexCheck.status === "HUMAN_AUTH_REQUIRED") {
      state.status = "HUMAN_GATE";
      lastStatus = "HUMAN_AUTH_REQUIRED";
      writeArtifact(artifactDir, "audit.json", {
        finalStatus: "HUMAN_AUTH_REQUIRED",
        reason: "Codex CLI requires human authentication",
      });
      return state;
    }

    // Build prompt with real self-correction context
    const prompt = buildImplementationPrompt({
      taskId: contract.taskId,
      objective: contract.objective,
      planSteps: plan.steps,
      allowedPaths: contract.scope.allowedPaths,
      forbiddenPaths: contract.scope.forbiddenPaths,
      cycle,
      maxCycles: MAX_CYCLES,
      previousDiffSummary: cycle > 1 ? previousDiffSummary : undefined,
      failedVerifications: cycle > 1 ? failedVerifications : undefined,
      auditorFeedback: cycle > 1 ? auditorFeedback : undefined,
      scopeViolation: cycle > 1 ? scopeViolationNotes : undefined,
    });

    const codexResult = await execCodexTask({
      taskId: contract.taskId,
      prompt,
      worktreePath: worktree.path,
      allowedPaths: contract.scope.allowedPaths,
      forbiddenPaths: contract.scope.forbiddenPaths,
      timeoutSeconds: contract.execution.timeoutSeconds,
    });

    if (codexResult.blocked) {
      lastStatus = (codexResult.blockReason as AgentResultStatus) ?? "FAIL";
      writeArtifact(artifactDir, `codex-cycle-${cycle}-blocked.json`, {
        blockReason: codexResult.blockReason,
        exitCode: codexResult.exitCode,
        stderr: codexResult.stderr,
      });
      if (lastStatus === "HUMAN_AUTH_REQUIRED") {
        state.status = "HUMAN_GATE";
        writeArtifact(artifactDir, "audit.json", {
          finalStatus: "HUMAN_AUTH_REQUIRED",
          source: "CODEX",
          cycle,
          exitCode: codexResult.exitCode,
          stderr: codexResult.stderr,
        });
        return state;
      }
      break;
    }

    // ── 6. Mechanical Scope Enforcement ─────────────────────────
    const scopeCheck = verifyPathScope({
      worktreePath: worktree.path,
      allowedPaths: contract.scope.allowedPaths,
      forbiddenPaths: contract.scope.forbiddenPaths,
    });

    if (!scopeCheck.inScope) {
      lastStatus = "SCOPE_VIOLATION";
      scopeViolationNotes = `Violations: ${scopeCheck.violations.join(", ")}`;
      console.warn(`[task-runner] Cycle ${cycle} SCOPE_VIOLATION: ${scopeViolationNotes}`);

      const result = buildAgentResult({
        taskId: contract.taskId,
        planId: plan.planId,
        cycle,
        status: "SCOPE_VIOLATION",
        changedFiles: collectChangedFiles(worktree.path),
        diffStat: collectDiffStat(worktree.path),
        verificationResults: [],
        auditNotes: `Scope violation: ${scopeViolationNotes}`,
        errorMessage: scopeViolationNotes,
      });

      writeArtifact(artifactDir, `execution-cycle-${cycle}.json`, result);
      continue; // Retry in next cycle with scope correction feedback
    }

    // ── 7. Guarded Verification ─────────────────────────────────
    state.status = "VERIFYING";

    const verifications = runVerificationCommands({
      commands: contract.verification.commands,
      cwd: worktree.path,
    });

    const verSummary = summarizeVerification(verifications);
    const verPass = allVerificationsPassed(verifications);

    if (!verPass) {
      failedVerifications = verSummary;
    }

    // ── 8. Antigravity Audit ─────────────────────────────────────
    state.status = "AUDITING";

    const diffStat = collectDiffStat(worktree.path);
    const changedFiles = collectChangedFiles(worktree.path);
    previousDiffSummary = diffStat;

    const auditDecision = await auditResult({
      taskId: contract.taskId,
      objective: contract.objective,
      diffStat,
      verificationSummary: verSummary,
      repositoryRoot,
    });

    if (auditDecision === "HUMAN_AUTH_REQUIRED") {
      state.status = "HUMAN_GATE";
      lastStatus = "HUMAN_AUTH_REQUIRED";
      writeArtifact(artifactDir, "audit.json", {
        finalStatus: "HUMAN_AUTH_REQUIRED",
        source: "ANTIGRAVITY_AUDIT",
        cycle,
      });
      return state;
    }

    auditorFeedback = `Auditor returned: ${auditDecision}`;

    const effectiveStatus: AgentResultStatus =
      auditDecision === "PASS" && verPass
        ? "PASS"
        : auditDecision === "ANTIGRAVITY_UNAVAILABLE"
        ? (verPass ? "PASS" : "FAIL")
        : (auditDecision as AgentResultStatus);

    const result = buildAgentResult({
      taskId: contract.taskId,
      planId: plan.planId,
      cycle,
      status: effectiveStatus,
      changedFiles,
      diffStat,
      verificationResults: verifications,
      auditNotes: `Audit cycle ${cycle}: ${auditDecision} (verifications: ${verPass ? "PASS" : "FAIL"})`,
    });

    state.result = result;
    writeArtifact(artifactDir, `execution-cycle-${cycle}.json`, result);

    lastStatus = result.status;

    if (result.status === "PASS") {
      // ── 9. Safe Scoped Staging & Commit ────────────────────────
      state.status = "COMMITTING";

      if (contract.sourceControl.commitAllowed) {
        safeScopedCommit({
          worktreePath: worktree.path,
          taskId: contract.taskId,
          title: contract.title,
          allowedPaths: contract.scope.allowedPaths,
          forbiddenPaths: contract.scope.forbiddenPaths,
        });
      }

      state.status = "COMPLETE";
      writeArtifact(artifactDir, "audit.json", { finalStatus: "PASS", cycle, result });
      return state;
    }

    if (result.status === "HUMAN_DECISION_REQUIRED") {
      state.status = "HUMAN_GATE";
      break;
    }

    // CORRECTION_REQUIRED / FAIL -> continue loop
    console.log(`[task-runner] Cycle ${cycle} → ${result.status}, retrying with feedback...`);
  }

  // Max cycles exhausted
  state.status = "BLOCKED";
  writeArtifact(artifactDir, "audit.json", {
    finalStatus: "AUTOMATION_BLOCKED",
    cycles: state.cycles,
    lastStatus,
  });

  return state;
}

// ─────────────────────────────────────────────────
// Mechanical Path Scope Enforcement
// ─────────────────────────────────────────────────

export function verifyPathScope(params: {
  worktreePath: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
}): { inScope: boolean; violations: string[] } {
  const { worktreePath, allowedPaths, forbiddenPaths } = params;
  const changed = collectChangedFiles(worktreePath);
  const violations: string[] = [];

  const sensitivePrefixes = [".env", ".artifacts", ".agent-worktrees", "secrets/"];

  for (const file of changed) {
    const normalized = file.replace(/\\/g, "/");

    // 1. Sensitive file check
    for (const sens of sensitivePrefixes) {
      if (normalized.startsWith(sens) || normalized.includes(`/${sens}`)) {
        violations.push(`Sensitive file modified: ${file}`);
      }
    }

    // 2. Forbidden paths check
    for (const forbidden of forbiddenPaths) {
      const cleanForb = forbidden.replace(/\\/g, "/");
      if (normalized.startsWith(cleanForb) || normalized.includes(cleanForb)) {
        violations.push(`Forbidden path touched: ${file} (matched forbidden '${forbidden}')`);
      }
    }

    // 3. Allowed paths check (if allowedPaths specified)
    if (allowedPaths.length > 0) {
      const isAllowed = allowedPaths.some((allowed) => {
        const cleanAllowed = allowed.replace(/\\/g, "/");
        return normalized.startsWith(cleanAllowed) || normalized === cleanAllowed;
      });
      if (!isAllowed) {
        violations.push(`Out of scope file modified: ${file} (not in allowedPaths)`);
      }
    }
  }

  return {
    inScope: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────
// Safe Scoped Staging & Commit
// ─────────────────────────────────────────────────

export function safeScopedCommit(params: {
  worktreePath: string;
  taskId: string;
  title: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
}): { stagedFiles: string[]; rejectedFiles: string[] } {
  const { worktreePath, taskId, title, allowedPaths, forbiddenPaths } = params;

  const statusResult = spawnSync("git", ["status", "--porcelain"], {
    cwd: worktreePath,
    encoding: "utf-8",
  });

  const stagedFiles: string[] = [];
  const rejectedFiles: string[] = [];

  const lines = (statusResult.stdout ?? "").trim().split("\n").filter(Boolean);

  for (const line of lines) {
    const status = line.slice(0, 2);
    let filePath = line.slice(3).trim();

    if (filePath.includes(" -> ")) {
      filePath = filePath.split(" -> ")[1].trim();
    }

    const normalized = filePath.replace(/\\/g, "/");

    // Never stage secrets or sensitive dirs
    if (
      normalized.startsWith(".env") ||
      normalized.startsWith(".artifacts") ||
      normalized.startsWith(".agent-worktrees") ||
      normalized.startsWith("secrets/")
    ) {
      rejectedFiles.push(filePath);
      continue;
    }

    // Never stage forbidden paths
    const isForbidden = forbiddenPaths.some((f) => normalized.startsWith(f.replace(/\\/g, "/")));
    if (isForbidden) {
      rejectedFiles.push(filePath);
      continue;
    }

    // Must be in allowed paths (if allowedPaths provided)
    if (allowedPaths.length > 0) {
      const isAllowed = allowedPaths.some((a) => normalized.startsWith(a.replace(/\\/g, "/")));
      if (!isAllowed) {
        rejectedFiles.push(filePath);
        continue;
      }
    }

    // File is safe to stage
    if (status.includes("D")) {
      spawnSync("git", ["rm", filePath], { cwd: worktreePath, encoding: "utf-8" });
    } else {
      spawnSync("git", ["add", filePath], { cwd: worktreePath, encoding: "utf-8" });
    }
    stagedFiles.push(filePath);
  }

  if (stagedFiles.length > 0) {
    const message = `automation(bridge): ${title} [${taskId}]`;
    spawnSync("git", ["commit", "-m", message], {
      cwd: worktreePath,
      encoding: "utf-8",
    });
    console.log(`[task-runner] Committed ${stagedFiles.length} file(s): ${message}`);
  } else {
    console.log("[task-runner] No eligible scoped files to commit.");
  }

  return { stagedFiles, rejectedFiles };
}

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function writeArtifact(dir: string, filename: string, data: unknown): void {
  writeFileSync(join(dir, filename), safeJsonStringify(data), "utf-8");
}

function writeApprovalRequest(
  repositoryRoot: string,
  req: import("./types.js").ApprovalRequest
): void {
  const approvalsDir = join(repositoryRoot, ".artifacts/approvals");
  ensureDir(approvalsDir);
  writeFileSync(
    join(approvalsDir, `${req.taskId}.json`),
    safeJsonStringify(req),
    "utf-8"
  );
}
