/**
 * TESTS: dry-run & CLI absence
 * Phase: AI-DEV-BRIDGE-A
 *
 * Verifies E2E dry-run contract, safe CLI degradation,
 * and that absent CLIs report CODEX_UNAVAILABLE / ANTIGRAVITY_UNAVAILABLE.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateContract,
  classifyTask,
  evaluateGate,
  checkCodex,
  checkAntigravity,
  preflight,
  runTask,
} from "../../automation/agent-bridge/src/index.js";
import type { TaskContract } from "../../automation/agent-bridge/src/types.js";

const dryRunContract: TaskContract = {
  taskId: "bridge-dry-run-001",
  title: "Agent bridge E2E dry-run - create fixture file",
  objective: "Create tests/fixtures/agent-bridge-dry-run/README.md explaining the bridge dry-run",
  repository: {
    root: process.cwd(),
    baseRef: "feature/ai-dev-bridge-a-codex-antigravity",
    taskBranch: "agent-task/bridge-dry-run-001",
  },
  scope: {
    allowedPaths: ["tests/fixtures/agent-bridge-dry-run/"],
    forbiddenPaths: ["supabase/", ".env*", "config/autonomy/"],
  },
  risk: {
    level: "R1",
    reason: "Write only to fixture directory - no production code touched",
  },
  execution: { maxCycles: 3, timeoutSeconds: 300 },
  verification: { commands: [] },
  sourceControl: {
    commitAllowed: false,
    pushFeatureBranchAllowed: false,
    prCreationAllowed: false,
    mergeAllowed: false,
  },
  createdAt: new Date().toISOString(),
};

describe("Foundation Dry-Run & CLI Degradation", () => {
  it("Dry-run task contract is strictly valid", () => {
    const val = validateContract(dryRunContract);
    assert.equal(val.valid, true, `Validation failed: ${val.errors.join(", ")}`);
    assert.equal(val.contract?.sourceControl.mergeAllowed, false);
  });

  it("Dry-run risk classification is R1 (AUTO)", () => {
    const assessment = classifyTask({
      targetBranch: dryRunContract.repository.taskBranch,
      targetEnvironment: "feature",
      actionDescription: dryRunContract.objective,
      modelSuggested: dryRunContract.risk.level,
    });
    assert.equal(assessment.effectiveLevel, "R1");
    assert.equal(assessment.staticDeterministic, true);
  });

  it("Approval gate for R1 returns proceed = true, mode = AUTO", async () => {
    const gate = await evaluateGate("R1");
    assert.equal(gate.proceed, true);
    assert.equal(gate.mode, "AUTO");
    assert.equal(gate.sandboxRequired, false);
  });

  it("Pre-flight executes and returns structured report", () => {
    const report = preflight();
    assert.equal(report.git.installed, true);
    assert.equal(report.node.installed, true);
    assert.equal(report.npm.installed, true);
    assert.ok(typeof report.agy.installed === "boolean");
    assert.ok(typeof report.codex.installed === "boolean");
  });

  it("CLI absence degradation: Codex returns CODEX_UNAVAILABLE or READY safely", () => {
    const check = checkCodex();
    assert.ok(
      check.status === "UNAVAILABLE" || check.status === "READY" || check.status === "HUMAN_AUTH_REQUIRED",
      `Unexpected codex status: ${check.status}`
    );
  });

  it("CLI absence degradation: Antigravity returns READY or UNAVAILABLE safely", () => {
    const check = checkAntigravity();
    assert.ok(
      check.status === "READY" || check.status === "UNAVAILABLE",
      `Unexpected agy status: ${check.status}`
    );
  });

  it("Safe execution degradation: runTask does not crash when CLI is unavailable", async () => {
    // Contract targeting fixture path only
    const state = await runTask(dryRunContract, process.cwd());
    assert.ok(state);
    assert.ok(
      state.status === "BLOCKED" ||
      state.status === "COMPLETE" ||
      state.status === "HUMAN_GATE",
      `Unexpected task state status: ${state.status}`
    );
  });
});
