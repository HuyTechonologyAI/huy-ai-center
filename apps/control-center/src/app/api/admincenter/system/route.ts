import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAdminCenterSystemStatus } from "@/lib/admincenter-runtime";
import { adminSessionSecret, verifyAdminSession } from "@/lib/admincenter-session";

function telemetryResponse(
  system: ReturnType<typeof buildAdminCenterSystemStatus>,
  telemetryErrors: string[],
) {
  return NextResponse.json(
    {
      ...system,
      aiFleet: {
        totalAgents: system.logicalAgents,
        verifiedAgents: system.verifiedAgents,
        activeAgents: system.activeAgents,
        standbyAgents: Math.max(0, system.verifiedAgents - system.activeAgents),
        unverifiedAgents: system.unverifiedAgents,
        quarantinedAgents: 0,
        businessUnitsCount: 6,
        quotaUtilizationPct: 0,
        tokensUsedTotal: 0,
        tokensLimitTotal: 0,
      },
      queue: {
        ...system.queue,
        pendingTasks: system.queue.pending,
        runningTasks: system.queue.running,
        completedTasks: system.queue.completed,
        failedTasks: system.queue.failed,
        totalTasks: system.queue.total,
        dispatcherStatus: system.runtimeDispatchEnabled ? "RUNNING" : "DISABLED",
      },
      topology: {
        controlPlane: {
          node: "Lenovo ThinkPad",
          role: "REMOTE_CONTROL_PLANE_ONLY",
          storagePolicy: "ZERO_PERMANENT_STORAGE",
        },
        authoritativeAnchor: {
          node: system.node?.name ?? null,
          name: system.node?.name ?? null,
          status: system.node?.status ?? null,
          hostname: system.node?.hostname ?? null,
          specs: system.node?.specs ?? null,
          storageRoots: {
            canonicalProjects: "/mnt/data1/Projects",
            directivesAndPayloads: "/mnt/data1/HUY-AI",
            stagingSpool: "/mnt/data1/HUY-AI/staging",
            protectedZone: "/mnt/data2 (R4_PROTECTED_LOCKED)",
          },
        },
      },
      runtime: {
        sourceOfTruth: "NODE01_SUPABASE",
        supervisorState: system.supervisorState,
        providerHealth: system.providerHealth,
        backlogTaskStatuses: system.backlogTaskStatuses,
        latestBottleneck: system.latestBottleneck,
        runtimeDispatchEnabled: system.runtimeDispatchEnabled,
        runtimeAgents: system.runtimeAgents,
        a2aTimeline: system.a2aTimeline,
        handoffs: system.handoffs,
        providerAttempts: system.providerAttempts,
        checkpointHistory: system.checkpointHistory,
        currentOwner: system.currentOwner,
        lastAction: system.lastAction,
        nextAction: system.nextAction,
        workExecution: system.workExecution,
        nodeMetrics: system.metrics,
        telemetryErrors,
      },
      realAuditLogs: system.realAuditLogs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp ?? log.created_at,
        event: log.action_type,
        actor: log.user_name || log.user_email || "SYSTEM",
        details: JSON.stringify(log.details ?? {}),
        level: "AUDIT",
      })),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const sessionCookie = (await cookies()).get("admincenter_session")?.value;
  let session = null;
  try {
    session = verifyAdminSession(sessionCookie, adminSessionSecret());
  } catch {
    session = null;
  }
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    // Import inside the handler so missing client configuration also fails closed.
    const { supabaseAdmin } = await import("@/lib/supabase-admin");
    const reads = [
      { table: "nodes", limit: 20, newest: false },
      { table: "node_heartbeats", limit: 50, newest: true },
      { table: "agents", limit: 100, newest: false },
      { table: "ai_providers", limit: 50, newest: false },
      { table: "ai_tasks", limit: 100, newest: true },
      { table: "audit_logs", limit: 50, newest: true },
    ] as const;
    const results = await Promise.all(
      reads.map(async ({ table, limit, newest }) => {
        let query = supabaseAdmin.schema("public").from(table).select("*");
        if (newest) {
          query = query.order("created_at", { ascending: false });
        }
        return await query.limit(limit);
      }),
    );
    const telemetryErrors = reads
      .filter((_, index) => results[index].error)
      .map(({ table }) => table);
    const [nodes, heartbeatRows, agents, providers, tasks, auditLogs] = results.map(
      ({ data, error }) => (error ? [] : (data ?? [])),
    );
    const heartbeats = heartbeatRows.map((row) => ({
      ...row,
      timestamp: row.created_at,
      cpu: row.cpu_usage_pct == null ? undefined : Number(row.cpu_usage_pct),
      ram: row.ram_usage_pct == null ? undefined : Number(row.ram_usage_pct),
      disk: row.disk_usage_pct == null ? undefined : Number(row.disk_usage_pct),
      queue: row.queue_depth,
    }));

    return telemetryResponse(
      buildAdminCenterSystemStatus({
        logicalCatalogSize: 59,
        nodes,
        heartbeats,
        agents,
        providers,
        tasks,
        auditLogs,
      }),
      telemetryErrors,
    );
  } catch {
    return telemetryResponse(
      buildAdminCenterSystemStatus({
        logicalCatalogSize: 59,
        nodes: [],
        heartbeats: [],
        agents: [],
        providers: [],
        tasks: [],
        auditLogs: [],
      }),
      ["supabase"],
    );
  }
}