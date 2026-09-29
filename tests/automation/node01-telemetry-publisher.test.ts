import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import {
  buildTelemetryPayload,
  deriveWorkExecution,
  deriveRemoteSyncStatus,
  parseGitAheadBehindCounts,
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
