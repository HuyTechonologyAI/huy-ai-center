/**
 * TESTS: risk-classifier
 * Phase: AI-DEV-BRIDGE-A
 *
 * Proves R0-R4 classification is deterministic and
 * that AI suggestions cannot lower the effective risk.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyCommand,
  classifyTask,
  maxRisk,
  isAutomatic,
  requiresHuman,
} from "../../automation/agent-bridge/src/risk-classifier.js";

describe("Risk Classifier — Static Determinism", () => {
  // ── R0 / R1 automatic ──────────────────────────
  it("R0: read commands are automatic", () => {
    const r = classifyCommand("cat package.json");
    assert.ok(isAutomatic(r.risk), `Expected automatic, got ${r.risk}`);
  });

  it("R1: npm run test is automatic", () => {
    const r = classifyCommand("npm run test");
    assert.equal(r.risk, "R1");
    assert.ok(isAutomatic(r.risk));
  });

  it("R1: npm run typecheck is automatic", () => {
    const r = classifyCommand("npm run typecheck");
    assert.equal(r.risk, "R1");
  });

  it("R1: git diff is automatic", () => {
    const r = classifyCommand("git diff --stat HEAD");
    assert.equal(r.risk, "R1");
  });

  it("R2: git commit on feature branch is R2", () => {
    const r = classifyCommand("git commit -m 'fix: something'");
    assert.equal(r.risk, "R2");
    assert.ok(isAutomatic(r.risk));
  });

  it("R2: git push feature branch is R2", () => {
    const r = classifyCommand("git push origin feature/my-task");
    assert.equal(r.risk, "R2");
    assert.ok(isAutomatic(r.risk));
  });

  it("R2: gh pr create is R2", () => {
    const r = classifyCommand("gh pr create --title 'test'");
    assert.equal(r.risk, "R2");
  });

  // ── R3 gated ──────────────────────────────────
  it("R3: git push origin main is blocked", () => {
    const r = classifyCommand("git push origin main");
    assert.equal(r.risk, "R3");
    assert.ok(requiresHuman(r.risk));
  });

  it("R3: git push --force is blocked", () => {
    const r = classifyCommand("git push --force origin feature/x");
    assert.equal(r.risk, "R3");
    assert.ok(requiresHuman(r.risk));
  });

  it("R3: git push -f is blocked", () => {
    const r = classifyCommand("git push -f");
    assert.equal(r.risk, "R3");
  });

  it("R3: git reset --hard is blocked", () => {
    const r = classifyCommand("git reset --hard HEAD~1");
    assert.equal(r.risk, "R3");
  });

  it("R3: vercel --prod is blocked", () => {
    const r = classifyCommand("vercel --prod");
    assert.equal(r.risk, "R3");
  });

  it("R3: supabase db push is blocked", () => {
    const r = classifyCommand("supabase db push");
    assert.equal(r.risk, "R3");
  });

  it("R3: gh pr merge is blocked", () => {
    const r = classifyCommand("gh pr merge 42");
    assert.equal(r.risk, "R3");
  });

  it("R3: env dump is blocked", () => {
    const r = classifyCommand("env");
    assert.equal(r.risk, "R3");
  });

  // ── R4 gated ──────────────────────────────────
  it("R4: DROP TABLE is blocked", () => {
    const r = classifyCommand("DROP TABLE public.agents");
    assert.equal(r.risk, "R4");
    assert.ok(requiresHuman(r.risk));
  });

  it("R4: DROP DATABASE is blocked", () => {
    const r = classifyCommand("DROP DATABASE production");
    assert.equal(r.risk, "R4");
  });

  it("R4: TRUNCATE is blocked", () => {
    const r = classifyCommand("TRUNCATE TABLE ai_tasks");
    assert.equal(r.risk, "R4");
  });

  it("R4: DELETE FROM is blocked", () => {
    const r = classifyCommand("DELETE FROM orders WHERE id = 1");
    assert.equal(r.risk, "R4");
  });

  // ── AI suggestion never lowers risk ────────────
  it("MAX: AI cannot lower risk from R3 to R1", () => {
    const effective = maxRisk("R3", "R1");
    assert.equal(effective, "R3");
  });

  it("MAX: AI cannot lower risk from R4 to R0", () => {
    const effective = maxRisk("R4", "R0");
    assert.equal(effective, "R4");
  });

  it("MAX: model suggestion R2 + static R1 = R2", () => {
    const effective = maxRisk("R1", "R2");
    assert.equal(effective, "R2");
  });

  it("MAX: no model suggestion keeps static risk", () => {
    const effective = maxRisk("R1", undefined);
    assert.equal(effective, "R1");
  });

  // ── classifyTask ───────────────────────────────
  it("classifyTask: production environment = R3 minimum", () => {
    const r = classifyTask({
      targetEnvironment: "production",
      actionDescription: "npm run build",
    });
    assert.ok(requiresHuman(r.effectiveLevel));
  });

  it("classifyTask: main branch = R3", () => {
    const r = classifyTask({
      targetBranch: "main",
      actionDescription: "git push",
    });
    assert.equal(r.effectiveLevel, "R3");
  });

  it("classifyTask: feature branch + test = R1 automatic", () => {
    const r = classifyTask({
      targetBranch: "feature/my-task",
      targetEnvironment: "feature",
      actionDescription: "npm run test",
    });
    assert.ok(isAutomatic(r.effectiveLevel));
  });

  it("classifyTask: model suggests R0 but static says R3 → R3 wins", () => {
    const r = classifyTask({
      targetBranch: "main",
      actionDescription: "git push",
      modelSuggested: "R0",
    });
    assert.equal(r.effectiveLevel, "R3", "Static must win over model suggestion");
  });
});
