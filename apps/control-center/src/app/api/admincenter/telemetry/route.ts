import { NextResponse } from "next/server";
import { verifyNode01TelemetryEnvelope } from "@/lib/node01-telemetry";
import {
  NODE01_TELEMETRY_KEY_FINGERPRINT,
  NODE01_TELEMETRY_PUBLIC_KEY_PEM,
} from "@/lib/node01-telemetry-public";

export const runtime = "nodejs";

function json(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "PAYLOAD_INVALID" }, 400);
  }

  const verified = verifyNode01TelemetryEnvelope(
    body as { payload: string; signature: string },
    NODE01_TELEMETRY_PUBLIC_KEY_PEM,
  );
  if (!verified.ok) {
    return json(
      { ok: false, error: verified.reason },
      verified.reason === "SIGNATURE_INVALID" ? 401 : 400,
    );
  }

  let supabaseAdmin;
  try {
    ({ supabaseAdmin } = await import("@/lib/supabase-admin"));
  } catch {
    return json({ ok: false, error: "TELEMETRY_STORAGE_UNAVAILABLE" }, 503);
  }

  const { payload } = verified;
  const { metrics } = payload;
  const { error: heartbeatError } = await supabaseAdmin
    .schema("public")
    .from("node_heartbeats")
    .insert({
      node_id: "huy-ai-node-01",
      cpu_usage_pct: metrics.cpu,
      ram_usage_pct: metrics.ram,
      ram_total_mb: metrics.ramTotal,
      ram_free_mb: metrics.ramFree,
      disk_usage_pct: metrics.disk,
      queue_depth: metrics.queue,
      active_tasks: metrics.active,
      status: payload.status,
      metadata: payload.metadata,
      created_at: payload.timestamp,
    });

  if (heartbeatError) {
    return json({ ok: false, error: "HEARTBEAT_WRITE_FAILED" }, 503);
  }

  const { error: nodeError } = await supabaseAdmin
    .schema("public")
    .from("nodes")
    .update({
      status: payload.status,
      current_load: metrics.active,
      last_heartbeat_at: payload.timestamp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "huy-ai-node-01");

  if (nodeError) {
    return json({ ok: false, error: "NODE_STATUS_WRITE_FAILED" }, 503);
  }

  return json({
    ok: true,
    nodeId: "huy-ai-node-01",
    timestamp: payload.timestamp,
    keyFingerprint: NODE01_TELEMETRY_KEY_FINGERPRINT,
  }, 202);
}