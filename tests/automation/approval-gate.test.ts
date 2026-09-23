/**
 * TESTS: approval-gate
 * Phase: AI-DEV-BRIDGE-A
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { evaluateGate, resetPolicyCache } from "../../automation/agent-bridge/src/approval-gate.js";

describe("Approval Gate", () => {
  beforeEach(() => {
    resetPolicyCache();
  });

  it("R0 => AUTO (proceed=true)", async () => {
    const result = await evaluateGate("R0");
    assert.equal(result.proceed, true);
    assert.equal(result.mode, "AUTO");
  });

  it("R1 => AUTO (proceed=true)", async () => {
    const result = await evaluateGate("R1");
    assert.equal(result.proceed, true);
    assert.equal(result.mode, "AUTO");
  });

  it("R2 => AUTO + sandbox required", async () => {
    const result = await evaluateGate("R2");
    assert.equal(result.proceed, true);
    assert.equal(result.mode, "AUTO");
    assert.equal(result.sandboxRequired, true);
  });

  it("R3 => HUMAN_REQUIRED (proceed=false)", async () => {
    const result = await evaluateGate("R3");
    assert.equal(result.proceed, false);
    assert.equal(result.mode, "HUMAN_REQUIRED");
  });

  it("R4 => HUMAN_OWNER_REQUIRED (proceed=false)", async () => {
    const result = await evaluateGate("R4");
    assert.equal(result.proceed, false);
    assert.equal(result.mode, "HUMAN_OWNER_REQUIRED");
  });

  it("R3 gate reason mentions human", async () => {
    const result = await evaluateGate("R3");
    assert.ok(
      result.reason.toLowerCase().includes("human"),
      `Expected reason to mention 'human', got: ${result.reason}`
    );
  });

  it("PR merge is R3 (human gate)", async () => {
    // PR merge classification leads to R3 gate
    const { classifyCommand } = await import("../../automation/agent-bridge/src/risk-classifier.js");
    const risk = classifyCommand("gh pr merge 42");
    const gate = await evaluateGate(risk.risk);
    assert.equal(gate.proceed, false);
  });
});
