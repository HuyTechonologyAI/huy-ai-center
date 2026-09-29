import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import {
  buildTelemetryPayload,
  deriveWorkExecution,
  deriveRemoteSyncStatus,
  parseGitAheadBehindCounts,
  parseRuntimeWorkersFromPs,
  normalizeA2ATimeline,
  deriveRuntimeAgents,
  deriveHandoffs,
  deriveProviderAttempts,
  sanitizeProviderSnapshot,
  signTelemetryEnvelope,
  summarizeBacklogState,
} from "../../automation/agent-bridge/src/node01-telemetry-publisher.js";

describe("node01 telemetry publisher", () => {
  const metrics = { cpu: 25, ram: 50, disk: 70, ramFree: 4000, ramTotal: 8000, active: 1, queue: 2 };

  it("builds a bounded secret-free payload with runtime worker counts", () => {
    const payload = buildTelemetryPayload({
      timestamp: "2026-09-28T10:00:00.000Z",
      status: "ONLINE",
      metrics,
      metadata: {
        supervisorState: "RUNNING",
        providerHealth: { codex: { available: true } },
        backlogTaskStatuses: { task: { status: "RUNNING" } },
        runtimeWorkers: { codex: 1, antigravity: 0, bad: -1 },
        latestBottleneck: null,
        remoteSyncStatus: "SYNC_PENDING",
        token: "secret",
      },
    });
    assert.equal(payload.nodeId, "huy-ai-node-01");
    assert.deepEqual(payload.metadata.runtimeWorkers, { codex: 1, antigravity: 0 });
    assert.equal("token" in payload.metadata, false);
    assert.throws(() => buildTelemetryPayload({ timestamp: payload.timestamp, status: "ONLINE", metrics: { ...metrics, cpu: 101 } }));
  });

  it("signs exact payload with Ed25519", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const payload = buildTelemetryPayload({ timestamp: new Date().toISOString(), status: "ONLINE", metrics });
    const envelope = signTelemetryEnvelope(payload, privateKey);
    assert.equal(Buffer.from(envelope.signature, "base64").length, 64);
    assert.equal(verify(null, Buffer.from(envelope.payload), publicKey, Buffer.from(envelope.signature, "base64")), true);
  });

  it("sanitizes provider and backlog snapshots", () => {
    assert.deepEqual(sanitizeProviderSnapshot({
      available: true, authenticated: true, circuit: "CLOSED", consecutiveFailures: 0,
      cooldownUntil: 0, lastError: "token=secret",
    }), { available: true, authenticated: true, circuit: "CLOSED", consecutiveFailures: 0, cooldownUntil: 0 });
    const summary = summarizeBacklogState({ a: { status: "BLOCKED", reason: "Bearer abc.def.ghi", extra: "omit" } });
    assert.equal(summary.a.status, "BLOCKED");
    assert.equal("extra" in summary.a, false);
    assert.equal(summary.a.reason.includes("abc.def.ghi"), false);
  });

  it("derives remote sync state fail-closed", () => {
    assert.equal(deriveRemoteSyncStatus({ behind: 0, ahead: 0 }), "SYNCED");
    assert.equal(deriveRemoteSyncStatus({ behind: 0, ahead: 2 }), "SYNC_PENDING");
    assert.equal(deriveRemoteSyncStatus({ behind: 1, ahead: 0 }), "DIVERGED_FAIL_CLOSED");
    assert.equal(deriveRemoteSyncStatus(null), "SYNC_PENDING");
  });
});

  it("derives bounded current work logic from supervisor, backlog and checkpoint evidence", () => {
    assert.deepEqual(deriveWorkExecution({
      supervisor: { taskId: "06k-c-production-apply", backlogStatus: "HUMAN_GATE" },
      backlog: { "06k-c-production-apply": { status: "HUMAN_GATE", reason: "Owner approval required for R4" } },
      checkpoint: null,
    }), {
      currentTask: "06k-c-production-apply",
      stage: "HUMAN_GATE",
      checkpointStatus: "HUMAN_GATE",
      lastAction: "Owner approval required for R4",
      nextAction: "Human Owner approval required before execution",
    });

    assert.deepEqual(deriveWorkExecution({
      supervisor: { taskId: "task-a", backlogStatus: "RUNNING" },
      backlog: { "task-a": { status: "RUNNING" } },
      checkpoint: { stage: "TEST_DESIGN", status: "VERIFIED", completed_work: "Tests designed", next_step: "IMPLEMENTATION" },
    }), {
      currentTask: "task-a",
      stage: "TEST_DESIGN",
      checkpointStatus: "VERIFIED",
      lastAction: "Tests designed",
      nextAction: "IMPLEMENTATION",
    });
  });

it("maps git rev-list HEAD...upstream left/right counts to ahead/behind correctly", () => {
  assert.deepEqual(parseGitAheadBehindCounts("51\t0\n"), { ahead: 51, behind: 0 });
  assert.deepEqual(parseGitAheadBehindCounts("0 3"), { ahead: 0, behind: 3 });
  assert.equal(parseGitAheadBehindCounts("not-a-count"), null);
});


it("detects real cloud and local runtime workers from ps output", () => {
  const workers = parseRuntimeWorkersFromPs([
    "/usr/bin/node persistent-supervisor.ts",
    "/home/huy/bin/codex exec --sandbox read-only task",
    "/mnt/data1/HUY-AI/runtime/ollama/lib/ollama/llama-server --model qwen.gguf",
    "/home/huy/.local/bin/agy -p task",
  ].join("\n"));
  assert.equal(workers.codex, 1);
  assert.equal(workers.ollama, 1);
  assert.equal(workers.antigravity, 1);
  assert.equal(workers.claude, 0);
  assert.equal(workers.gemini, 0);
});

it("normalizes an append-only checkpoint chain into chronological A2A events", () => {
  const timeline = normalizeA2ATimeline([
    {
      checkpoint_id: "cp3", previous_checkpoint_id: "cp2", task_id: "08a-model-gateway",
      stage: "DECOMPOSITION", owner_agent: "COORDINATOR", status: "VERIFIED",
      completed_work: "Subtasks assigned", next_step: "TEST_DESIGN", created_at: "2026-09-29T03:39:51.901Z",
    },
    {
      checkpoint_id: "cp2", previous_checkpoint_id: "cp1", task_id: "08a-model-gateway",
      stage: "PLAN", owner_agent: "OLLAMA", status: "VERIFIED",
      completed_work: "Plan contains steps", next_step: "DECOMPOSITION", created_at: "2026-09-29T03:39:51.899Z",
    },
    {
      checkpoint_id: "cp1", previous_checkpoint_id: null, task_id: "08a-model-gateway",
      stage: "RECEIVED", owner_agent: "COORDINATOR", status: "VERIFIED",
      completed_work: "Eligible R0-R2 task", next_step: "PLAN", created_at: "2026-09-29T03:38:31.115Z",
    },
  ]);
  assert.deepEqual(timeline.map(x => [x.sequence, x.stage, x.ownerAgent]), [
    [1, "RECEIVED", "COORDINATOR"],
    [2, "PLAN", "OLLAMA"],
    [3, "DECOMPOSITION", "COORDINATOR"],
  ]);
  assert.equal(timeline[2].nextStep, "TEST_DESIGN");
});

it("derives logical runtime agents independently from the empty production agent registry", () => {
  const agents = deriveRuntimeAgents({
    supervisorState: "RUNNING",
    workExecution: {
      currentTask: "08a-model-gateway",
      stage: "DECOMPOSITION",
      checkpointStatus: "VERIFIED",
      lastAction: "Subtasks assigned",
      nextAction: "TEST_DESIGN",
    },
    runtimeWorkers: { ollama: 1, codex: 0, antigravity: 0 },
    timeline: [
      { sequence: 1, taskId: "08a-model-gateway", stage: "PLAN", ownerAgent: "OLLAMA", status: "VERIFIED", completedWork: "Plan", nextStep: "DECOMPOSITION", createdAt: "2026-09-29T03:39:51Z", checkpointId: "cp" }
    ],
  });
  assert.ok(agents.some(x => x.id === "ollama-local" && x.provider === "ollama"));
  assert.ok(agents.some(x => x.id === "coordinator" && x.role === "COORDINATOR"));
  assert.ok(agents.some(x => x.role === "TEST_DESIGNER" && x.taskId === "08a-model-gateway"));
});

it("telemetry payload keeps bounded runtimeAgents and a2aTimeline while dropping secrets", () => {
  const payload = buildTelemetryPayload({
    timestamp: "2026-09-29T04:00:00.000Z",
    status: "ONLINE",
    metrics: { cpu: 25, ram: 50, disk: 70, ramFree: 4000, ramTotal: 8000, active: 1, queue: 2 },
    metadata: {
      runtimeAgents: [
        { id: "ollama-local", role: "TEST_DESIGNER", provider: "ollama", state: "RUNNING", taskId: "08a", stage: "TEST_DESIGN" },
      ],
      a2aTimeline: [
        { sequence: 1, taskId: "08a", stage: "PLAN", ownerAgent: "OLLAMA", status: "VERIFIED", completedWork: "Plan", nextStep: "TEST_DESIGN", createdAt: "2026-09-29T03:00:00Z", checkpointId: "abc" },
      ],
      secret: "DROP_ME",
    },
  });
  assert.equal(payload.metadata.runtimeAgents?.[0]?.provider, "ollama");
  assert.equal(payload.metadata.a2aTimeline?.[0]?.stage, "PLAN");
  assert.equal("secret" in payload.metadata, false);
});


it("derives verified handoffs and provider-attempt history from checkpoint evidence", () => {
  const timeline = [
    { sequence: 1, taskId: "08a", stage: "RECEIVED", ownerAgent: "COORDINATOR", status: "VERIFIED", completedWork: "received", nextStep: "PLAN", createdAt: "2026-09-29T03:00:00Z", checkpointId: "cp1" },
    { sequence: 2, taskId: "08a", stage: "PLAN", ownerAgent: "OLLAMA", status: "VERIFIED", completedWork: "planned", nextStep: "DECOMPOSITION", createdAt: "2026-09-29T03:01:00Z", checkpointId: "cp2" },
    { sequence: 3, taskId: "08a", stage: "DECOMPOSITION", ownerAgent: "COORDINATOR", status: "VERIFIED", completedWork: "assigned", nextStep: "TEST_DESIGN", createdAt: "2026-09-29T03:02:00Z", checkpointId: "cp3" },
  ];
  const handoffs = deriveHandoffs(timeline);
  assert.equal(handoffs.length, 2);
  assert.deepEqual([handoffs[0].fromAgent, handoffs[0].toAgent], ["COORDINATOR", "OLLAMA"]);
  const attempts = deriveProviderAttempts(timeline);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].provider, "ollama");
  assert.equal(attempts[0].role, "PLANNER");
  assert.equal(attempts[0].status, "VERIFIED");
});
