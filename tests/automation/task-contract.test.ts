/**
 * TESTS: task-contract
 * Phase: AI-DEV-BRIDGE-A
 *
 * Validates contract schema enforcement and
 * that mergeAllowed is always false.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateContract } from "../../automation/agent-bridge/src/index.js";

const validContract = {
  taskId: "bridge-test-001",
  title: "Test task contract validation",
  objective: "Validate that the task contract schema is correctly enforced",
  repository: {
    root: "/repo",
    baseRef: "feature/ai-dev-bridge-a-codex-antigravity",
    taskBranch: "agent-task/bridge-test-001",
  },
  scope: {
    allowedPaths: ["tests/fixtures/"],
    forbiddenPaths: ["supabase/", ".env", "config/autonomy/"],
  },
  risk: { level: "R1", reason: "Write-only to fixture directory" },
  execution: { maxCycles: 3, timeoutSeconds: 600 },
  verification: { commands: ["npm run typecheck"] },
  sourceControl: {
    commitAllowed: true,
    pushFeatureBranchAllowed: true,
    prCreationAllowed: true,
    mergeAllowed: false,
  },
  createdAt: new Date().toISOString(),
};

describe("Task Contract Validator", () => {
  it("valid contract passes validation", () => {
    const result = validateContract(validContract);
    assert.equal(result.valid, true, `Errors: ${result.errors.join(", ")}`);
    assert.ok(result.contract);
  });

  it("missing taskId fails validation", () => {
    const bad = { ...validContract, taskId: undefined } as unknown;
    const result = validateContract(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("taskId")));
  });

  it("missing objective fails validation", () => {
    const bad = { ...validContract, objective: undefined } as unknown;
    const result = validateContract(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("objective")));
  });

  it("mergeAllowed=true fails validation", () => {
    const bad = {
      ...validContract,
      sourceControl: { ...validContract.sourceControl, mergeAllowed: true },
    } as unknown;
    const result = validateContract(bad);
    assert.equal(result.valid, false,
      "mergeAllowed=true must be rejected — merge is always R3/HUMAN");
    assert.ok(result.errors.some((e) => e.includes("mergeAllowed")));
  });

  it("missing repository fails validation", () => {
    const bad = { ...validContract, repository: undefined } as unknown;
    const result = validateContract(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("repository")));
  });

  it("missing scope fails validation", () => {
    const bad = { ...validContract, scope: undefined } as unknown;
    const result = validateContract(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("scope")));
  });

  it("non-object input fails validation", () => {
    const result = validateContract("not-an-object");
    assert.equal(result.valid, false);
  });

  it("valid contract has mergeAllowed=false", () => {
    const result = validateContract(validContract);
    assert.equal(result.valid, true);
    assert.equal(result.contract?.sourceControl.mergeAllowed, false,
      "Contract must enforce mergeAllowed=false");
  });
});
