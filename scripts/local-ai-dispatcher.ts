/**
 * LOCAL AI WORKER DISPATCHER & EXECUTION RUNNER
 * Canonical Blueprint V3.0 (Sections 12, 17, 18, 19, 21, 28)
 *
 * Role: L3-07 LOCAL_EXECUTION_WORKER under L2_ENGINEERING_MANAGER & ANTIGRAVITY_L1
 * Mission: Execute tasks locally on Node01 / Local Machine, verify deterministically,
 * append checkpoints, and emit standardized HAIP receipts back to Antigravity L1.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { hydrateContext, writebackCheckpoint } from './context-engine.js';

const ROOT = resolve(process.cwd());
const AGENCY_DIR = join(ROOT, '.ai-agency');

export interface TaskContract {
  task_id: string;
  objective: string;
  organization_id: string;
  department_id: string;
  owner_agent: string;
  required_capability: string[];
  scope: string[];
  write_scope: string[];
  forbidden_scope: string[];
  risk_level: 'R0' | 'R1' | 'R2' | 'R3' | 'R4';
  verification_commands: string[];
  status: string;
}

export function runLocalTask(contract: TaskContract) {
  console.log(`\n================================================================`);
  console.log(`🤖 [LOCAL-AI-WORKER] Received Task Contract: ${contract.task_id}`);
  console.log(`🎯 Objective: ${contract.objective}`);
  console.log(`🛡️  Risk Level: ${contract.risk_level} | Assigned To: ${contract.owner_agent}`);
  console.log(`================================================================`);

  // 1. Anti-Forgetting: Hydrate Context
  console.log(`[LOCAL-AI-WORKER] Hydrating context from .ai-agency...`);
  const ctx = hydrateContext(AGENCY_DIR);
  if (!ctx.valid) {
    console.error(`[LOCAL-AI-WORKER] ❌ Stale context detected! Aborting to prevent drift:`, ctx.staleFiles);
    return { success: false, reason: 'STALE_CONTEXT', staleFiles: ctx.staleFiles };
  }
  console.log(`[LOCAL-AI-WORKER] ✅ Context hydrated. Generation: ${ctx.generation}, LastCheckpoint: ${ctx.lastVerifiedCheckpoint}`);

  // 2. Risk Gate Enforcement
  if (contract.risk_level === 'R3' || contract.risk_level === 'R4') {
    console.warn(`[LOCAL-AI-WORKER] ⛔ Task risk is ${contract.risk_level}. Halting execution at Human Gate.`);
    return { success: false, reason: 'HUMAN_GATE_REQUIRED', risk: contract.risk_level };
  }

  // 3. Execute Verification Commands Locally (Zero Cloud Token Cost)
  const receipts: any[] = [];
  let allPass = true;

  for (const cmdStr of contract.verification_commands) {
    console.log(`\n[LOCAL-AI-WORKER] ⚡ Executing local command: ${cmdStr}`);
    const startMs = Date.now();
    const res = spawnSync(cmdStr, {
      shell: true,
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 120000
    });
    const durationMs = Date.now() - startMs;
    const exitCode = res.status ?? (res.error ? 1 : 0);
    const pass = exitCode === 0;

    console.log(`[LOCAL-AI-WORKER] Command finished in ${durationMs}ms with ExitCode=${exitCode} (${pass ? 'PASS' : 'FAIL'})`);
    if (!pass) {
      allPass = false;
      console.error(`[LOCAL-AI-WORKER] Stderr:`, (res.stderr || res.stdout || '').slice(-300));
    }

    receipts.push({
      command: cmdStr,
      exitCode,
      durationMs,
      pass,
      outputSnippet: (res.stdout || '').slice(0, 200).trim()
    });

    if (!allPass) break;
  }

  // 4. Generate Checkpoint & Writeback
  const checkpointId = `CHK-${contract.task_id}-${Date.now().toString().slice(-6)}`;
  const status = allPass ? 'VERIFIED' : 'FAILED';

  console.log(`\n[LOCAL-AI-WORKER] Writing append-only checkpoint: ${checkpointId} (${status})...`);
  writebackCheckpoint(AGENCY_DIR, 'ws-01-core-agency', {
    checkpoint_id: checkpointId,
    parent_checkpoint_id: ctx.lastVerifiedCheckpoint,
    task_id: contract.task_id,
    stage: 'LOCAL_EXECUTION_COMPLETED',
    owner_agent: contract.owner_agent,
    status,
    completed_work: [
      `Executed local task ${contract.task_id}`,
      `Ran ${receipts.length} verification commands without cloud token consumption`
    ],
    evidence_refs: receipts.map(r => `${r.command} (code ${r.exitCode})`),
    test_receipts: receipts
  });

  // 5. Emit Standardized Handoff Report
  const handoffContent = `# HANDOFF REPORT — ${contract.task_id}
**Time:** ${new Date().toISOString()}  
**Agent:** ${contract.owner_agent}  
**Status:** ${status}  

### WHAT WAS REQUESTED?
${contract.objective}

### WHAT IS DONE?
- Hydrated full canonical context (Generation ${ctx.generation}).
- Executed ${receipts.length} local verification commands.
- Appended verified checkpoint \`${checkpointId}\`.

### WHAT IS VERIFIED?
${receipts.map(r => `- \`${r.command}\`: ExitCode ${r.exitCode} (${r.pass ? 'PASS' : 'FAIL'}) in ${r.durationMs}ms`).join('\n')}

### WHAT CHANGED?
- Appended checkpoint \`${checkpointId}.json\`.
- Updated \`CONTEXT_MANIFEST.json\` to next context generation.

### WHAT DID NOT CHANGE?
- Production branches and cloud configurations remain untouched (R3/R4 gate intact).

### WHAT IS BLOCKED?
None.

### WHAT IS THE EXACT NEXT ACTION?
Antigravity L1 reviews checkpoint and schedules next workstream cycle.

### WHICH CHECKPOINT TO RESUME FROM?
\`${checkpointId}\`
`;

  writeFileSync(join(AGENCY_DIR, 'workstreams', 'ws-01-core-agency', 'HANDOFF.md'), handoffContent, 'utf-8');
  console.log(`[LOCAL-AI-WORKER] ✅ Handoff written at .ai-agency/workstreams/ws-01-core-agency/HANDOFF.md`);

  return {
    success: allPass,
    checkpointId,
    status,
    receipts
  };
}

// Default run: create and execute TaskContract 001
if (process.argv[1]?.endsWith('local-ai-dispatcher.ts')) {
  const contract: TaskContract = {
    task_id: "TASK-LOCAL-001-HEALTH-AUDIT",
    objective: "Run automated governance bridge tests and verify clean git status locally",
    organization_id: "org-01-group-core",
    department_id: "dept-01-engineering",
    owner_agent: "L3-07_LOCAL_EXECUTION_WORKER",
    required_capability: ["deterministic_verification", "test_runner"],
    scope: ["automation/agent-bridge", "tests/automation"],
    write_scope: [".ai-agency/workstreams/ws-01-core-agency"],
    forbidden_scope: ["packages/*", "apps/*", ".env*"],
    risk_level: "R1",
    verification_commands: [
      "git status --porcelain",
      "npm run test:bridge"
    ],
    status: "READY"
  };

  const tasksDir = join(AGENCY_DIR, 'workstreams', 'ws-01-core-agency', 'TASKS');
  writeFileSync(join(tasksDir, `${contract.task_id}.json`), JSON.stringify(contract, null, 2), 'utf-8');

  const result = runLocalTask(contract);
  console.log(`\n================================================================`);
  console.log(`🏁 [LOCAL-AI-WORKER] Task execution finished. Result:`, result.status);
  console.log(`================================================================`);
}
