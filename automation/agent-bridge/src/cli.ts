#!/usr/bin/env node
/**
 * CLI ENTRYPOINT — Codex × Antigravity Automation Bridge
 * Phase: AI-DEV-BRIDGE-A.1
 *
 * Explicit supported execution path invoked by orchestrator.ps1 or direct shell.
 * Usage:
 *   npx tsx automation/agent-bridge/src/cli.ts <path-to-task.json>
 *   npx tsx automation/agent-bridge/src/cli.ts --task <path-to-task.json>
 *   npx tsx automation/agent-bridge/src/cli.ts --preflight
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { validateContract, preflight } from "./index.js";
import { runTask } from "./task-runner.js";
import { safeJsonStringify } from "./log-redactor.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage:
  npx tsx automation/agent-bridge/src/cli.ts <task-contract.json>
  npx tsx automation/agent-bridge/src/cli.ts --preflight

Exit codes:
  0: Task COMPLETE (or preflight READY)
  1: Unhandled execution error
  2: Contract INVALID
  3: Stopped at HUMAN_GATE (R3/R4 approval needed)
  4: Task BLOCKED (cycles exhausted or CLI unavailable)
  5: Task FAILED (plan or audit error)
`);
    process.exit(0);
  }

  // Preflight command
  if (args.includes("--preflight")) {
    const report = preflight();
    console.log(safeJsonStringify(report, 2));
    process.exit(report.ready ? 0 : 1);
  }

  // Find task file argument
  let taskPath = "";
  if (args[0] === "--task" && args[1]) {
    taskPath = args[1];
  } else {
    taskPath = args[0];
  }

  let contractRaw: string;
  try {
    const resolvedPath = resolve(process.cwd(), taskPath);
    if (existsSync(resolvedPath)) {
      contractRaw = readFileSync(resolvedPath, "utf-8");
    } else {
      // Allow passing raw JSON directly
      contractRaw = taskPath;
    }
  } catch (err) {
    console.error(`[cli] ERROR: Cannot read task contract from '${taskPath}':`, err);
    process.exit(2);
  }

  let contractObj: unknown;
  try {
    contractObj = JSON.parse(contractRaw);
  } catch (err) {
    console.error(`[cli] ERROR: Contract is not valid JSON:`, err);
    process.exit(2);
  }

  const validation = validateContract(contractObj);
  if (!validation.valid || !validation.contract) {
    console.error("[cli] ERROR: Contract schema validation failed:");
    for (const err of validation.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(2);
  }

  const contract = validation.contract;
  console.log(`[cli] Task contract validated successfully: [${contract.taskId}] ${contract.title}`);
  console.log(`[cli] Target branch: ${contract.repository.taskBranch} | Base ref: ${contract.repository.baseRef}`);

  try {
    const state = await runTask(contract, process.cwd());

    // Write top-level report
    const artifactsDir = resolve(process.cwd(), ".artifacts");
    if (!existsSync(artifactsDir)) {
      mkdirSync(artifactsDir, { recursive: true });
    }
    const reportPath = join(artifactsDir, "bridge-run-report.json");
    writeFileSync(reportPath, safeJsonStringify(state, 2), "utf-8");

    console.log(`[cli] Task execution finished. Status: ${state.status}`);
    console.log(`[cli] Report written to: ${reportPath}`);

    switch (state.status) {
      case "COMPLETE":
        process.exit(0);
      case "HUMAN_GATE":
        console.log(`[cli] Action requires human approval. See .artifacts/approvals/${contract.taskId}.json`);
        process.exit(3);
      case "BLOCKED":
        console.warn(`[cli] Task automation blocked. Last status recorded.`);
        process.exit(4);
      case "FAILED":
        console.error(`[cli] Task execution failed.`);
        process.exit(5);
      default:
        process.exit(0);
    }
  } catch (err) {
    console.error("[cli] FATAL: Unexpected error during task execution:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[cli] Uncaught error:", err);
  process.exit(1);
});
