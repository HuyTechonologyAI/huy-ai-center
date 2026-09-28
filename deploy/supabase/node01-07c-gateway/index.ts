import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const PUBLIC_KEY_PEM = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAKSs3iZw8M4TiXUV9s7c2Q6bI2blHVwN32cNXmrt6OlU=\n-----END PUBLIC KEY-----";
const NODE_ID = "huy-ai-node-01";
const WORKER_ID = "huy-ai-node-01-07c-canary";
const MAX_CLOCK_SKEW_MS = 90_000;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function b64Bytes(value: string): Uint8Array {
  const raw = atob(value);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function pemDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/g, "");
  return b64Bytes(b64);
}

async function verifyEnvelope(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_ENVELOPE");
  const input = body as { payload?: unknown; signature?: unknown };
  if (typeof input.payload !== "string" || typeof input.signature !== "string") throw new Error("INVALID_ENVELOPE");
  const key = await crypto.subtle.importKey("spki", pemDer(PUBLIC_KEY_PEM), { name: "Ed25519" }, false, ["verify"]);
  const ok = await crypto.subtle.verify(
    { name: "Ed25519" },
    key,
    b64Bytes(input.signature),
    new TextEncoder().encode(input.payload),
  );
  if (!ok) throw new Error("INVALID_SIGNATURE");

  let payload: any;
  try { payload = JSON.parse(input.payload); } catch { throw new Error("INVALID_PAYLOAD_JSON"); }
  if (payload?.version !== 1 || payload?.nodeId !== NODE_ID) throw new Error("INVALID_IDENTITY");
  const ts = Date.parse(String(payload?.timestamp ?? ""));
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) throw new Error("STALE_REQUEST");
  if (typeof payload?.nonce !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(payload.nonce)) throw new Error("INVALID_NONCE");
  if (!["health", "poll_claim", "finalize_canary"].includes(payload?.operation)) throw new Error("INVALID_OPERATION");
  return payload as { operation: string; body?: any; nonce: string; timestamp: string };
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SERVER_CONFIGURATION_MISSING");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function pollClaim(supabase: ReturnType<typeof serviceClient>) {
  const { data: jobs, error: readError } = await supabase.rpc("haip_read_jobs", {
    p_worker_id: WORKER_ID,
    p_batch_size: 1,
    p_vt: 120,
  });
  if (readError) throw new Error("QUEUE_READ_FAILED:" + readError.message);
  if (!Array.isArray(jobs) || jobs.length === 0) return { job: null };

  const row = jobs[0] as any;
  const message = row?.message;
  const taskId = String(message?.task_id ?? "");
  const msgId = Number(row?.msg_id);
  if (!/^[0-9a-f-]{36}$/i.test(taskId) || !Number.isSafeInteger(msgId) || msgId <= 0) {
    throw new Error("INVALID_QUEUE_MESSAGE");
  }
  if (message?.message_type !== "TASK" || message?.identity?.agent_id !== "agent-07c-canary-sentinel") {
    throw new Error("NON_CANARY_MESSAGE_VISIBLE");
  }

  const { data: task, error: taskError } = await supabase
    .from("ai_tasks")
    .select("id,source_app,intent,status,state_version,organization_id,assigned_capability,risk_level,data_classification,input,approval_required,approval_status")
    .eq("id", taskId)
    .single();
  if (taskError || !task) throw new Error("TASK_LOOKUP_FAILED");
  if (
    task.source_app !== "phase-07c" ||
    task.intent !== "SYSTEM_E2E_CANARY" ||
    task.status !== "QUEUED" ||
    task.risk_level !== 0 ||
    task.approval_required !== false ||
    task.approval_status !== "NOT_REQUIRED"
  ) throw new Error("CANARY_SCOPE_DENIED");

  const { data: collision, error: collisionError } = await supabase
    .from("agents").select("id").eq("id", "agent-07c-canary-sentinel").maybeSingle();
  if (collisionError) throw new Error("AGENT_COLLISION_CHECK_FAILED");
  if (collision) throw new Error("SENTINEL_AGENT_COLLISION");

  const { data: claimed, error: claimError } = await supabase.rpc("claim_ai_task", {
    p_task_id: taskId,
    p_worker_id: WORKER_ID,
    p_expected_version: task.state_version,
  });
  if (claimError) throw new Error("TASK_CLAIM_FAILED:" + claimError.message);
  if (!Array.isArray(claimed) || claimed.length !== 1) throw new Error("TASK_CLAIM_RACE");

  const orgId = String(task.organization_id ?? "");
  const { data: org, error: orgError } = await supabase
    .from("organizations").select("id,data_classification_ceiling").eq("id", orgId).single();
  if (orgError || !org) throw new Error("ORG_LOOKUP_FAILED");

  return {
    job: {
      msgId,
      taskId,
      request: {
        organization_id: orgId,
        capabilities: [String(task.assigned_capability || "e2e-smoke")],
        risk_level: 0,
        data_classification: String(task.data_classification || "PUBLIC"),
        payload: { ...(task.input ?? {}), task_id: taskId, message_id: msgId, canary: true },
      },
      context: {
        organization_id: orgId,
        risk_ceiling: 0,
        data_classification_ceiling: String(org.data_classification_ceiling || "PUBLIC"),
        agents: [],
      },
    },
  };
}

async function finalizeCanary(supabase: ReturnType<typeof serviceClient>, body: any) {
  const taskId = String(body?.taskId ?? "");
  const msgId = Number(body?.msgId);
  const reason = String(body?.decisionReason ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(taskId) || !Number.isSafeInteger(msgId) || msgId <= 0) {
    throw new Error("INVALID_FINALIZE_INPUT");
  }
  if (reason !== "NO_ELIGIBLE_AGENT") throw new Error("UNEXPECTED_CANARY_DECISION");

  const { data: task, error: taskError } = await supabase
    .from("ai_tasks")
    .select("id,source_app,intent,status,risk_level,claimed_by_node_id")
    .eq("id", taskId).single();
  if (taskError || !task) throw new Error("FINALIZE_TASK_LOOKUP_FAILED");
  if (
    task.source_app !== "phase-07c" ||
    task.intent !== "SYSTEM_E2E_CANARY" ||
    task.risk_level !== 0 ||
    task.status !== "CLAIMED" ||
    task.claimed_by_node_id !== WORKER_ID
  ) throw new Error("FINALIZE_SCOPE_DENIED");

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("ai_tasks")
    .update({
      status: "CANCELLED",
      output: { e2e_canary: true, result: reason, cleanup: "COMPLETE", gateway: "node01-07c-gateway" },
      claimed_by_node_id: null,
      claimed_at: null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", taskId)
    .eq("status", "CLAIMED");
  if (updateError) throw new Error("FINALIZE_TASK_UPDATE_FAILED:" + updateError.message);

  const { data: archived, error: archiveError } = await supabase.rpc("haip_archive_job", { p_msg_id: msgId });
  if (archiveError) throw new Error("QUEUE_ARCHIVE_FAILED:" + archiveError.message);
  return { finalized: true, archived: Boolean(archived), taskId, msgId };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const envelope = await req.json();
    const request = await verifyEnvelope(envelope);
    if (request.operation === "health") {
      return json(200, { ok: true, nodeId: NODE_ID, gateway: "07c-canary-v1" });
    }
    const supabase = serviceClient();
    if (request.operation === "poll_claim") return json(200, await pollClaim(supabase));
    if (request.operation === "finalize_canary") return json(200, await finalizeCanary(supabase, request.body));
    return json(400, { error: "INVALID_OPERATION" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /SIGNATURE|IDENTITY|STALE|NONCE/.test(message) ? 401 : /SCOPE|CANARY|COLLISION|UNEXPECTED/.test(message) ? 403 : 400;
    return json(status, { error: message.slice(0, 300) });
  }
});
