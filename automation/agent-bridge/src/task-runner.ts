/**
 * TASK RUNNER — Core execution loop
 * Phase: AI-DEV-BRIDGE-A
 *
 * Orchestrates: Contract → Risk → Plan → Gate → Impl → Verify → Audit → Commit
 * Maximum 3 self-correction cycles.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync, spawnSync } from "node:child_process";
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

  // ── 1. Static risk assessment ──────────────────
  state.status = "RISK_ASSESSED";
  const riskAssessment = classifyTask({
    targetBranch: contract.repository.taskBranch,
    targetEnvironment: "feature",
    actionDescription: contract.objective,
    modelSuggested: contract.risk.level,
  });
  state.risk = riskAssessment;

  writeArtifact(artifactDir, "risk.json", riskAssessment);

  // ── 2. Gate check ──────────────────────────────
  const gate = await evaluateGate(riskAssessment.effectiveLevel);

  if (!gate.proceed) {
    // R3/R4 — produce approval request and stop
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

  // ── 3. Planning (Antigravity) ──────────────────
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

  if (plan.rawOutput?.includes("ANTIGRAVITY_UNAVAILABLE") || plan.steps.length === 0) {
    console.warn(`[task-runner] Antigravity plan is empty/unavailable for ${contract.taskId}`);
    // Continue with a fallback: objective-only execution
  }

  // ── 4. Worktree isolation ──────────────────────
  const worktree = createWorktree({
    taskId: contract.taskId,
    baseBranch: contract.repository.baseRef,
    repositoryRoot,
  });
  state.worktree = worktree;

  // ── 5. Self-correction implementation loop ─────
  let lastStatus: AgentResultStatus = "PENDING" as AgentResultStatus;

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    state.cycles = cycle;
    state.status = "IMPLEMENTING";

    console.log(`[task-runner] Task ${contract.taskId} → cycle ${cycle}/${MAX_CYCLES}`);

    // Codex implementation
    const codexCheck = checkCodex();
    let implSucceeded = false;

    if (codexCheck.status === "READY") {
      const prompt = buildImplementationPrompt({
        taskId: contract.taskId,
        objective: contract.objective,
        planSteps: plan.steps,
        allowedPaths: contract.scope.allowedPaths,
        forbiddenPaths: contract.scope.forbiddenPaths,
      });

      const codexResult = await execCodexTask({
        taskId: contract.taskId,
        prompt,
        worktreePath: worktree.path,
        allowedPaths: contract.scope.allowedPaths,
        forbiddenPaths: contract.scope.forbiddenPaths,
        timeoutSeconds: contract.execution.timeoutSeconds,
      });

      implSucceeded = codexResult.success;

      if (codexResult.blocked) {
        lastStatus = codexResult.blockReason as AgentResultStatus ?? "CODEX_UNAVAILABLE";
        break;
      }
    } else {
      console.warn(`[task-runner] Codex unavailable (${codexCheck.status}) — skipping impl step`);
      lastStatus = codexCheck.status === "HUMAN_AUTH_REQUIRED"
        ? ("CODEX_UNAVAILABLE" as AgentResultStatus)
        : ("CODEX_UNAVAILABLE" as AgentResultStatus);
      break;
    }

    // ── 6. Verification ─────────────────────────
    state.status = "VERIFYING";

    const verifications = runVerificationCommands({
      commands: contract.verification.commands,
      cwd: worktree.path,
    });

    const verSummary = summarizeVerification(verifications);
    const verPass = allVerificationsPassed(verifications);

    // ── 7. Antigravity audit ─────────────────────
    state.status = "AUDITING";

    const diffStat = collectDiffStat(worktree.path);
    const changedFiles = collectChangedFiles(worktree.path);

    const auditDecision = await auditResult({
      taskId: contract.taskId,
      objective: contract.objective,
      diffStat,
      verificationSummary: verSummary,
      repositoryRoot,
    });

    const result = buildAgentResult({
      taskId: contract.taskId,
      planId: plan.planId,
      cycle,
      status: auditDecision === "PASS" && verPass
        ? "PASS"
        : auditDecision === "ANTIGRAVITY_UNAVAILABLE"
        ? (verPass ? "PASS" : "FAIL")
        : auditDecision as AgentResultStatus,
      changedFiles,
      diffStat,
      verificationResults: verifications,
      auditNotes: `Audit cycle ${cycle}: ${auditDecision}`,
    });

    state.result = result;
    writeArtifact(artifactDir, `execution-cycle-${cycle}.json`, result);

    lastStatus = result.status;

    if (result.status === "PASS") {
      // ── 8. Commit ────────────────────────────
      state.status = "COMMITTING";

      if (contract.sourceControl.commitAllowed) {
        autoCommit({
          worktreePath: worktree.path,
          taskId: contract.taskId,
          title: contract.title,
          branch: worktree.branch,
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

    // CORRECTION_REQUIRED → continue loop
    console.log(`[task-runner] Cycle ${cycle} → ${result.status}, retrying...`);
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

function autoCommit(params: {
  worktreePath: string;
  taskId: string;
  title: string;
  branch: string;
}): void {
  const { worktreePath, taskId, title } = params;

  // Only add changed files (no -A which could pick up secrets)
  spawnSync("git", ["add", "-u"], { cwd: worktreePath, encoding: "utf-8" });

  const message = `automation(bridge): ${title} [${taskId}]`;
  spawnSync("git", ["commit", "-m", message], {
    cwd: worktreePath,
    encoding: "utf-8",
  });

  console.log(`[task-runner] Committed: ${message}`);
}
