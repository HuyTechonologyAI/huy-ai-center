import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildAdminCenterSystemStatus } from "../apps/control-center/src/lib/admincenter-runtime.js";

const now = "2026-09-29T06:40:00.000Z";
const a2aMetadata = {
  supervisorState: "RUNNING",
  runtimeAgents: [
    { id: "coordinator", role: "COORDINATOR", state: "RUNNING", taskId: "08a-model-gateway", stage: "DECOMPOSITION" },
    { id: "ollama-local", role: "TEST_DESIGNER", provider: "ollama", state: "RUNNING", taskId: "08a-model-gateway", stage: "TEST_DESIGN" },
  ],
  a2aTimeline: [
    { sequence: 1, taskId: "08a-model-gateway", stage: "PLAN", ownerAgent: "OLLAMA", status: "VERIFIED", nextStep: "DECOMPOSITION" },
  ],
  handoffs: [
    { sequence: 1, taskId: "08a-model-gateway", fromAgent: "COORDINATOR", toAgent: "OLLAMA", fromStage: "RECEIVED", toStage: "PLAN", status: "VERIFIED" },
  ],
  providerAttempts: [
    { sequence: 1, taskId: "08a-model-gateway", provider: "ollama", role: "PLANNER", stage: "PLAN", status: "VERIFIED" },
  ],
  checkpointHistory: [
    { sequence: 1, taskId: "08a-model-gateway", stage: "PLAN", ownerAgent: "OLLAMA", status: "VERIFIED" },
  ],
  currentOwner: "COORDINATOR",
  lastAction: "Subtasks assigned",
  nextAction: "TEST_DESIGN",
  workExecution: {
    currentTask: "08a-model-gateway",
    stage: "DECOMPOSITION",
    checkpointStatus: "VERIFIED",
    lastAction: "Subtasks assigned",
    nextAction: "TEST_DESIGN",
  },
};

test("AdminCenter exposes live A2A telemetry separately from catalog agents", () => {
  const system = buildAdminCenterSystemStatus({
    logicalCatalogSize: 59,
    agents: [],
    providers: [],
    heartbeats: [{
      node_id: "huy-ai-node-01",
      timestamp: now,
      status: "ONLINE",
      metadata: a2aMetadata,
    }],
    tasks: [],
    now,
  });
  assert.equal(system.logicalAgents, 59);
  assert.equal(system.activeAgents, 0);
  assert.equal(system.runtimeAgents.length, 2);
  assert.equal(system.runtimeAgents[1].provider, "ollama");
  assert.equal(system.a2aTimeline[0].stage, "PLAN");
  assert.equal(system.handoffs[0].toAgent, "OLLAMA");
  assert.equal(system.providerAttempts[0].provider, "ollama");
  assert.equal(system.checkpointHistory.length, 1);
  assert.equal(system.currentOwner, "COORDINATOR");
  assert.equal(system.workExecution?.nextAction, "TEST_DESIGN");
});

test("AdminCenter UI labels catalog, runtime agents, providers, and A2A flow distinctly", () => {
  const source = readFileSync(new URL("../apps/control-center/src/app/admincenter/page.tsx", import.meta.url), "utf8");
  for (const label of ["Catalog Agents", "Runtime Active Agents", "Providers", "A2A Flow"]) {
    assert.match(source, new RegExp(label, "i"));
  }
});
