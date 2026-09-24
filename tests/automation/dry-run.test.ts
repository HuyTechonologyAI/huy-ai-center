/**
 * TESTS: dry-run, CLI degradation, and real E2E bridge execution
 * Phase: AI-DEV-BRIDGE-A.1 (Split Safe Degradation & Real E2E Test)
 *
 * A. SAFE_DEGRADATION_TEST: CLI may be unavailable, verifies safe degradation.
 * B. REAL_E2E_BRIDGE_TEST: When CLIs/auth are present, executes real synthetic fixture flow.
 * C. ORCHESTRATOR_CLI_INVOCATION_TEST: Verifies orchestrator/cli entrypoint contract.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { writeFileSync, unlinkSync, existsSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from 'node:crypto';
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
    baseRef: "HEAD",
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

/** Remove only a unique test-owned worktree after preserving its PASS receipt. */
function cleanPassedFixture(contract: TaskContract, status: string): void {
  if (status !== 'COMPLETE' || !/^bridge-(dry-run|e2e-live)-[a-f0-9-]{36}$/.test(contract.taskId)) return;
  const path = join(process.cwd(), '.agent-worktrees', contract.taskId);
  if (!existsSync(path)) return;
  const changes = spawnSync('git', ['status', '--porcelain'], { cwd: path, encoding: 'utf8' });
  assert.equal(changes.status, 0);
  assert.ok(changes.stdout.split('\n').filter(Boolean).every(line => line.slice(3).startsWith('tests/fixtures/agent-bridge-dry-run/')),
    'Unexpected changes in fixture worktree; preserving it for inspection');
  const receiptDir = join(process.cwd(), '.artifacts/agent-bridge/acceptance');
  mkdirSync(receiptDir, { recursive: true });
  const auditPath = join(process.cwd(), '.artifacts/agent-bridge', contract.taskId, 'audit.json');
  assert.ok(existsSync(auditPath), 'Missing audit evidence; preserving fixture for inspection');
  const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
  assert.equal(audit.finalStatus, 'PASS');
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(commit.status, 0);
  writeFileSync(join(receiptDir, `${contract.taskId}.json`), JSON.stringify({ taskId: contract.taskId,
    status, featureCommit: commit.stdout.trim(), verifiedAt: new Date().toISOString(), audit }));
  const removed = spawnSync('git', ['worktree', 'remove', '--force', path], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(removed.status, 0, removed.stderr);
  const deleted = spawnSync('git', ['branch', '-D', contract.repository.taskBranch], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(deleted.status, 0, deleted.stderr);
  rmSync(join(process.cwd(), '.artifacts/agent-bridge', contract.taskId), { recursive: true, force: true });
}

describe("A. SAFE_DEGRADATION_TEST", () => {
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

  it("Pre-flight executes and returns structured report with valid tools", () => {
    const report = preflight();
    assert.equal(report.git.installed, true);
    assert.equal(report.node.installed, true);
    assert.equal(report.npm.installed, true);
    assert.ok(typeof report.agy.installed === "boolean");
    assert.ok(typeof report.codex.installed === "boolean");
  });

  it("CLI absence degradation: Codex returns UNAVAILABLE or AUTH_UNKNOWN safely", () => {
    const check = checkCodex();
    assert.ok(
      check.status === "UNAVAILABLE" ||
      check.status === "AUTH_UNKNOWN" ||
      check.status === "AUTH_READY" ||
      check.status === "HUMAN_AUTH_REQUIRED",
      `Unexpected codex status: ${check.status}`
    );
  });

  it("CLI absence degradation: Antigravity returns AUTH_UNKNOWN or UNAVAILABLE safely", () => {
    const check = checkAntigravity();
    assert.ok(
      check.status === "AUTH_UNKNOWN" ||
      check.status === "AUTH_READY" ||
      check.status === "UNAVAILABLE",
      `Unexpected agy status: ${check.status}`
    );
  });

  it("Safe execution degradation: runTask does not crash when CLI is unavailable", async () => {
    const taskId = `bridge-dry-run-${randomUUID()}`;
    const contract = { ...dryRunContract, taskId,
      repository: { ...dryRunContract.repository, taskBranch: `agent-task/${taskId}` } };
    const state = await runTask(contract, process.cwd());
    assert.ok(state);
    assert.ok(
      state.status === "BLOCKED" ||
      state.status === "COMPLETE" ||
      state.status === "HUMAN_GATE" ||
      state.status === "FAILED",
      `Unexpected task state status: ${state.status}`
    );
    cleanPassedFixture(contract, state.status);
  });
});

describe("B. REAL_E2E_BRIDGE_TEST", () => {
  it("REAL_E2E: Executes full flow to PASS if CLIs are AUTH_READY, otherwise reports NOT_EXECUTED_CI_ENVIRONMENT", async () => {
    const codex = checkCodex();
    const agy = checkAntigravity();

    if (process.env.BRIDGE_REAL_E2E !== '1') {
      console.log(
        "    ℹ [REAL_E2E_BRIDGE_TEST] REAL_E2E: NOT_EXECUTED_CI_ENVIRONMENT (Requires authenticated Codex & Antigravity on trusted local machine)."
      );
      return;
    }
    assert.ok(codex.installed && agy.installed, 'Real acceptance requires installed Codex and Antigravity CLIs');

    // Both CLIs installed and authenticated: execute fixture contract and require real PASS
    const realContract: TaskContract = {
      ...dryRunContract,
      taskId: `bridge-e2e-live-${randomUUID()}`,
      repository: { ...dryRunContract.repository },
      verification: { commands: ['npm run typecheck'] },
    };
    realContract.repository.taskBranch = `agent-task/${realContract.taskId}`;

    const state = await runTask(realContract, process.cwd());
    assert.ok(state);
    assert.equal(
      state.status,
      "COMPLETE",
      `Real authenticated E2E test must complete with PASS, got: ${state.status}`
    );
    cleanPassedFixture(realContract, state.status);
  });
});

describe("C. ORCHESTRATOR_CLI_INVOCATION_TEST", () => {
  const cliPath = resolve(process.cwd(), "automation/agent-bridge/src/cli.ts");

  it("cli.ts --preflight runs via tsx and exits with code 0", () => {
    const res = spawnSync("npx", ["tsx", cliPath, "--preflight"], {
      cwd: process.cwd(),
      encoding: "utf-8",
      shell: true,
      timeout: 15000,
    });
    assert.equal(res.status, 0, `cli.ts --preflight failed: ${res.stderr || res.stdout}`);
    assert.ok(res.stdout.includes("git"), "Preflight output should mention git");
  });

  it("cli.ts rejects invalid JSON contract with exit code 2", () => {
    const tempFile = join(process.cwd(), ".test-invalid-contract.json");
    writeFileSync(tempFile, "{ not valid json", "utf-8");

    try {
      const res = spawnSync("npx", ["tsx", cliPath, tempFile], {
        cwd: process.cwd(),
        encoding: "utf-8",
        shell: true,
        timeout: 10000,
      });
      assert.equal(res.status, 2, "Invalid contract must return exit code 2");
    } finally {
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }
    }
  });

  it("cli.ts rejects contract missing required fields with exit code 2", () => {
    const tempFile = join(process.cwd(), ".test-missing-field.json");
    writeFileSync(tempFile, JSON.stringify({ taskId: "bad" }), "utf-8");

    try {
      const res = spawnSync("npx", ["tsx", cliPath, tempFile], {
        cwd: process.cwd(),
        encoding: "utf-8",
        shell: true,
        timeout: 10000,
      });
      assert.equal(res.status, 2, "Contract missing fields must return exit code 2");
    } finally {
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }
    }
  });
});
