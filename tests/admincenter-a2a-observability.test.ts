import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";

import { buildAdminCenterSystemStatus } from "../apps/control-center/src/lib/admincenter-runtime.js";
import { verifyNode01TelemetryEnvelope } from "../apps/control-center/src/lib/node01-telemetry.js";
import { buildTelemetryPayload, signTelemetryEnvelope } from "../automation/agent-bridge/src/node01-telemetry-publisher.js";

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


test("recovered telemetry verifier accepts the current signed Node01 publisher contract", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const payload = buildTelemetryPayload({
    timestamp: now,
    status: "ONLINE",
    metrics: { cpu: 12, ram: 34, disk: 56, ramFree: 4096, ramTotal: 8192, active: 1, queue: 2 },
    metadata: a2aMetadata,
  });
  const envelope = signTelemetryEnvelope(payload, privateKey);
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const verified = verifyNode01TelemetryEnvelope(envelope, pem, Date.parse(now));
  assert.equal(verified.ok, true);
  if (verified.ok) {
    assert.equal(verified.payload.metrics.cpu, 12);
    assert.equal(verified.payload.status, "ONLINE");
    assert.equal(verified.payload.metadata.a2aTimeline instanceof Array, true);
  }
});

test("telemetry route defers Supabase admin initialization until request time", () => {
  const source = readFileSync(new URL("../apps/control-center/src/app/api/admincenter/telemetry/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^import\s+\{\s*supabaseAdmin\s*\}/m);
  assert.match(source, /await import\(["']@\/lib\/supabase-admin["']\)/);
});


test("AdminCenter session token is signed, expires, and rejects tampering", async () => {
  const { signAdminSession, verifyAdminSession } = await import(
    "../apps/control-center/src/lib/admincenter-session.js"
  );
  const secret = "test-secret-with-sufficient-entropy";
  const issuedAt = Date.parse("2026-09-29T10:00:00.000Z");
  const token = signAdminSession("SuperAdmin", secret, issuedAt, 60_000);
  assert.equal(verifyAdminSession(token, secret, issuedAt + 30_000)?.username, "SuperAdmin");
  assert.equal(verifyAdminSession(token + "x", secret, issuedAt + 30_000), null);
  assert.equal(verifyAdminSession(token, secret, issuedAt + 60_001), null);
});

test("AdminCenter server routes no longer trust the literal authenticated cookie", () => {
  const auth = readFileSync(new URL("../apps/control-center/src/app/api/admincenter/auth/route.ts", import.meta.url), "utf8");
  const system = readFileSync(new URL("../apps/control-center/src/app/api/admincenter/system/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(auth, /sessionCookie\s*===\s*["']authenticated["']/);
  assert.doesNotMatch(system, /sessionCookie\s*!==\s*["']authenticated["']/);
  assert.match(auth, /verifyAdminSession/);
  assert.match(system, /verifyAdminSession/);
});

test("AdminCenter password state persists through Supabase instead of serverless filesystem", () => {
  const auth = readFileSync(new URL("../apps/control-center/src/app/api/admincenter/auth/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(auth, /writeFileSync|AUTH_FILE_PATH/);
  assert.match(auth, /cms_settings/);
  assert.match(auth, /admincenter_auth/);
});


test("AdminCenter preserves one-time bootstrap login only before durable auth exists", () => {
  const auth = readFileSync(new URL("../apps/control-center/src/app/api/admincenter/auth/route.ts", import.meta.url), "utf8");
  assert.match(auth, /INITIAL_DEFAULT_PASSWORD/);
  assert.doesNotMatch(auth, /if \(!stored\) return NextResponse\.json\(\{ error: "AUTH_NOT_INITIALIZED"/);
  assert.match(auth, /mustChangePassword\s*=\s*!stored\s*\|\|\s*stored\.isInitialDefault/);
  assert.match(auth, /await saveStoredAuth\(updatedAuth\)/);
});
