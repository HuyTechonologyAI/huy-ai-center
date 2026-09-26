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
import { buildImplementationPrompt } from "./codex-adapter.js";
import {
  auditResultMulti,
  buildTestDesignPrompt,
  executeImplementationMulti,
  executeTestDesignMulti,
  generatePlanMulti
} from "./multi-agent-adapter.js";
import type { ProviderId } from "./provider-mesh.js";
import { createWorktree } from "./worktree-manager.js";
import {
  collectDiffStat,
  collectReviewDiff,
  enforceEditBudget,
  collectChangedFiles,
  runVerificationCommands,
  summarizeVerification,
  buildAgentResult,
  allVerificationsPassed,
} from "./result-auditor.js";
import { safeJsonStringify } from "./log-redactor.js";
import { checkpointStage } from './checkpoints.js';

const ARTIFACTS_ROOT = ".artifacts/agent-bridge";
const MAX_CYCLES = 8;

// ─────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────

export async function runTask(
  contract: TaskContract,
  repositoryRoot: string,
  checkpoint = false
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

  const coordinatorBeforePlan = gitPorcelain(repositoryRoot);

  const plan = await generatePlanMulti({
    taskId: contract.taskId,
    title: contract.title,
    objective: contract.objective,
    allowedPaths: contract.scope.allowedPaths,
    forbiddenPaths: contract.scope.forbiddenPaths,
    repositoryRoot,
    timeoutSeconds: 120,
  });
  if (gitPorcelain(repositoryRoot) !== coordinatorBeforePlan) throw new Error("PLANNER_MODIFIED_COORDINATOR");

  state.plan = { ...plan, approvedByGate: true };
  writeArtifact(artifactDir, "plan.json", plan);

  if (plan.rawOutput === "HUMAN_AUTH_REQUIRED") {
    state.status = "HUMAN_GATE";
    writeArtifact(artifactDir, "audit.json", {
      finalStatus: "HUMAN_AUTH_REQUIRED",
      reason: "All available planning providers require human authentication",
    });
    return state;
  }

  if (plan.rawOutput === "AGENT_PLAN_INVALID" || plan.rawOutput === "ALL_PLANNERS_UNAVAILABLE") {
    state.status = "BLOCKED";
    writeArtifact(artifactDir, "audit.json", {
      finalStatus: plan.rawOutput,
      reason: "No planning provider produced a valid executable plan",
    });
    return state;
  }

  if (checkpoint) {
    if (!plan.steps.length) throw Error('PLAN_WITHOUT_STEPS');
    for (const step of plan.steps) {
      if (step.targetFiles?.some(file => !contract.scope.allowedPaths.some(path => file === path || file.startsWith(path)))) {
        throw Error('PLAN_SCOPE_INVALID');
      }
    }
    checkpointStage(repositoryRoot, { taskId: contract.taskId, stage: 'PLAN', owner: plan.model.toUpperCase(),
      objective: contract.objective, evidence: plan, method: 'validated planner steps', result: 'Plan contains steps', next: 'DECOMPOSITION' });
    const subtasks = plan.steps.map((step, index) => ({ subtask_id: `${contract.taskId}-${index + 1}`,
      task_id: contract.taskId, owner_agent: 'MULTI_AI_IMPLEMENTER', objective: step.description,
      input: contract.objective, output: step.targetFiles ?? contract.scope.allowedPaths,
      depends_on: index ? [`${contract.taskId}-${index}`] : [],
      allowed_paths: contract.scope.allowedPaths, acceptance: contract.verification.commands,
      test_commands: contract.verification.commands, cross_review_agent: 'INDEPENDENT_PROVIDER',
      source_checkpoint: 'PLAN_VERIFIED' }));
    checkpointStage(repositoryRoot, { taskId: contract.taskId, stage: 'DECOMPOSITION', owner: 'COORDINATOR',
      objective: contract.objective, evidence: { contract, subtasks }, method: 'contract scope and plan steps',
      result: 'Subtasks assigned to provider mesh within allowed paths', next: 'TEST_DESIGN' });
  }

  // ── 4. Worktree isolation (taskBranch authoritative) ───────────
  let worktree: ReturnType<typeof createWorktree>;
  try {
    worktree = createWorktree({
      taskId: contract.taskId,
      baseBranch: contract.repository.baseRef,
      repositoryRoot,
      taskBranch: contract.repository.taskBranch,
    });
  } catch (error) {
    state.status = "BLOCKED";
    writeArtifact(artifactDir, "audit.json", {
      finalStatus: "TASK_WORKTREE_UNAVAILABLE",
      reason: String(error),
    });
    return state;
  }
  state.worktree = worktree;

  // ── 5. Test-first design stage (mandatory before production-code edits) ──
  const testDesignPrompt = buildTestDesignPrompt({
    taskId: contract.taskId,
    objective: contract.objective,
    planSteps: plan.steps,
    allowedPaths: contract.scope.allowedPaths,
    forbiddenPaths: contract.scope.forbiddenPaths,
    verification: contract.verification.commands,
  });

  const testDesign = await executeTestDesignMulti({
    taskId: contract.taskId,
    prompt: testDesignPrompt,
    worktreePath: worktree.path,
    timeoutSeconds: Math.min(contract.execution.timeoutSeconds, 900),
  });

  writeArtifact(artifactDir, "test-design.json", {
    provider: testDesign.provider,
    success: testDesign.success,
    stdoutTail: testDesign.stdout.slice(-6000),
    stderrTail: testDesign.stderr.slice(-4000),
    exitCode: testDesign.exitCode,
    blockReason: testDesign.blockReason,
  });

  if (!testDesign.success) {
    if (testDesign.blockReason === "HUMAN_AUTH_REQUIRED") {
      state.status = "HUMAN_GATE";
      writeArtifact(artifactDir, "audit.json", {
        finalStatus: "HUMAN_AUTH_REQUIRED",
        source: "TEST_DESIGNER",
      });
      return state;
    }
    state.status = "BLOCKED";
    writeArtifact(artifactDir, "audit.json", {
      finalStatus: "TEST_DESIGN_BLOCKED",
      reason: testDesign.stderr || testDesign.blockReason,
    });
    return state;
  }

  const preImplementationVerification = runVerificationCommands({
    commands: contract.verification.commands,
    cwd: worktree.path,
  });
  writeArtifact(artifactDir, "tdd-pre-implementation.json", {
    provider: testDesign.provider,
    stage: "TESTS_BEFORE_IMPLEMENTATION",
    verificationResults: preImplementationVerification,
    expectedRedAllowed: true,
  });

  if (checkpoint) {
    checkpointStage(repositoryRoot, {
      taskId: contract.taskId,
      stage: 'TEST_DESIGN',
      owner: (testDesign.provider ?? 'PROVIDER_MESH').toUpperCase(),
      objective: contract.objective,
      evidence: {
        provider: testDesign.provider,
        verificationResults: preImplementationVerification,
      },
      method: 'tests designed before implementation and executed once',
      result: 'Test-first baseline captured',
      next: 'IMPLEMENTATION',
    });
  }

  // ── 6. Self-correction implementation loop ─────────────────────
  let lastStatus: AgentResultStatus = "PENDING" as AgentResultStatus;
  let previousDiffSummary = "";
  let failedVerifications = "";
  let auditorFeedback = "";
  let scopeViolationNotes = "";

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    state.cycles = cycle;
    state.status = "IMPLEMENTING";

    console.log(`[task-runner] Task ${contract.taskId} → cycle ${cycle}/${MAX_CYCLES}`);

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

    const implementationResult = await executeImplementationMulti({
      taskId: contract.taskId,
      prompt,
      worktreePath: worktree.path,
      allowedPaths: contract.scope.allowedPaths,
      forbiddenPaths: contract.scope.forbiddenPaths,
      timeoutSeconds: contract.execution.timeoutSeconds,
    });

    const implementerProvider = implementationResult.provider as ProviderId | undefined;

    if (implementationResult.blocked) {
      lastStatus = implementationResult.blockReason === "HUMAN_AUTH_REQUIRED"
        ? "HUMAN_AUTH_REQUIRED"
        : "AUTOMATION_BLOCKED";
      writeArtifact(artifactDir, `implementer-cycle-${cycle}-blocked.json`, {
        provider: implementerProvider,
        blockReason: implementationResult.blockReason,
        exitCode: implementationResult.exitCode,
        stdoutTail: implementationResult.stdout.slice(-4000),
        stderrTail: implementationResult.stderr.slice(-4000),
      });
      if (lastStatus === "HUMAN_AUTH_REQUIRED") {
        state.status = "HUMAN_GATE";
        writeArtifact(artifactDir, "audit.json", {
          finalStatus: "HUMAN_AUTH_REQUIRED",
          source: implementerProvider ?? "PROVIDER_MESH",
          cycle,
          exitCode: implementationResult.exitCode,
          stderr: implementationResult.stderr,
        });
        return state;
      }
      break;
    }

    // ── 7. Mechanical Scope Enforcement ─────────────────────────
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

    // ── 8. Guarded Verification ─────────────────────────────────
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

    // ── 9. Independent cross-provider audit ──────────────────────
    state.status = "AUDITING";

    const diffStat = collectDiffStat(worktree.path);
    const changedFiles = collectChangedFiles(worktree.path);
    previousDiffSummary = diffStat;
    const reviewDiff = collectReviewDiff(worktree.path);
    if (checkpoint) enforceEditBudget(reviewDiff);

    const audit = await auditResultMulti({
      taskId: contract.taskId,
      objective: contract.objective,
      planSummary: plan.steps.map(step => step.description).join('\n'),
      diffStat,
      reviewDiff,
      verificationSummary: verSummary,
      repositoryRoot,
      excludeProviders: implementerProvider ? [implementerProvider] : [],
    });
    const auditDecision = audit.decision;
    writeArtifact(artifactDir, `auditor-cycle-${cycle}.json`, audit);
    if (gitPorcelain(repositoryRoot) !== coordinatorBeforePlan) throw new Error("AUDITOR_MODIFIED_COORDINATOR");

    if (auditDecision === "HUMAN_AUTH_REQUIRED") {
      state.status = "HUMAN_GATE";
      lastStatus = "HUMAN_AUTH_REQUIRED";
      writeArtifact(artifactDir, "audit.json", {
        finalStatus: "HUMAN_AUTH_REQUIRED",
        source: audit.provider ?? "PROVIDER_MESH_AUDIT",
        cycle,
      });
      return state;
    }

    auditorFeedback = `Auditor returned: ${auditDecision}. ${audit.reason}`;

    const effectiveStatus: AgentResultStatus =
      auditDecision === "PASS" && verPass
        ? "PASS"
        : auditDecision === "AUDIT_INVALID"
        ? "AUDIT_INVALID"
        : (auditDecision as AgentResultStatus);

    const result = buildAgentResult({
      taskId: contract.taskId,
      planId: plan.planId,
      cycle,
      status: effectiveStatus,
      changedFiles,
      diffStat,
      verificationResults: verifications,
      auditNotes: `Audit cycle ${cycle}: ${auditDecision}; ${audit.reason} (verifications: ${verPass ? "PASS" : "FAIL"})`,
    });

    state.result = result;
    writeArtifact(artifactDir, `execution-cycle-${cycle}.json`, result);

    lastStatus = result.status;

    if (result.status === "PASS") {
      if (checkpoint) {
        if (!verifications.length || !verPass) throw Error('VERIFICATION_EVIDENCE_REQUIRED');
        checkpointStage(repositoryRoot, { taskId: contract.taskId, stage: 'IMPLEMENTATION', owner: (implementerProvider ?? 'PROVIDER_MESH').toUpperCase(),
          objective: contract.objective, evidence: { changedFiles, reviewDiff, verifications },
          method: 'guarded verification', result: 'All required commands passed', next: 'CROSS_REVIEW' });
        checkpointStage(repositoryRoot, { taskId: contract.taskId, stage: 'CROSS_REVIEW', owner: (audit.provider ?? 'PROVIDER_MESH').toUpperCase(),
          objective: contract.objective, evidence: { reviewDiff, auditDecision, verifications },
          method: 'independent patch audit', result: 'PASS', next: 'DELIVERY' });
      }
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

    if (result.status === 'AUDIT_INVALID') {
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
    auditorFeedback,
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
  if (statusResult.status !== 0) throw new Error("GIT_STATUS_FAILED");

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
      const removed = spawnSync("git", ["rm", "--", filePath], { cwd: worktreePath, encoding: "utf-8" });
      if (removed.status !== 0) throw new Error("GIT_RM_FAILED");
    } else {
      const added = spawnSync("git", ["add", "--", filePath], { cwd: worktreePath, encoding: "utf-8" });
      if (added.status !== 0) throw new Error("GIT_ADD_FAILED");
    }
    stagedFiles.push(filePath);
  }

  if (stagedFiles.length > 0) {
    const message = `automation(bridge): ${title} [${taskId}]`;
    const committed = spawnSync("git", ["commit", "-m", message], {
      cwd: worktreePath,
      encoding: "utf-8",
    });
    if (committed.status !== 0) throw new Error("GIT_COMMIT_FAILED");
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

function gitPorcelain(cwd: string): string {
  const result = spawnSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd, encoding: "utf-8" });
  if (result.status !== 0) throw new Error("GIT_STATUS_FAILED");
  return result.stdout;
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
