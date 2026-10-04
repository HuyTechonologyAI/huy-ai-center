import { redact } from "./log-redactor.js";

export type A2AEvent = {
  sequence: number; taskId: string; stage: string; ownerAgent: string;
  status: string; completedWork: string; nextStep: string;
  createdAt: string; checkpointId: string;
};
export type RuntimeAgent = {
  id: string; role: string; provider?: string; state: string; kind?: string;
  taskId: string; stage: string; lastAction?: string; nextAction?: string;
};
export type A2AHandoff = {
  sequence: number; taskId: string; fromAgent: string; toAgent: string;
  fromStage: string; toStage: string; timestamp: string; status: string;
};
export type ProviderAttempt = {
  sequence: number; taskId: string; provider: string; role: string;
  stage: string; status: string; timestamp: string; checkpointId: string;
};

const PROVIDERS = new Set(["ollama", "codex", "antigravity", "claude", "gemini", "chatgpt"]);

function text(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? redact(value).trim() : "";
  return (raw || fallback).replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 512);
}

export function stageRole(stage: unknown): string {
  const value = String(stage ?? "").toUpperCase();
  if (value === "PLAN") return "PLANNER";
  if (value === "TEST_DESIGN") return "TEST_DESIGNER";
  if (value === "IMPLEMENTATION") return "IMPLEMENTER";
  if (["CROSS_REVIEW", "REVIEW", "AUDIT"].includes(value)) return "REVIEWER";
  if (["DELIVERY", "COMPLETE", "COMPLETED"].includes(value)) return "DELIVERY";
  return "COORDINATOR";
}

export function parseRuntimeWorkersFromPs(raw: string): Record<string, number> {
  const lines = String(raw ?? "").split("\n");
  const rules: Record<string, RegExp> = {
    codex: /\bcodex exec\b/,
    antigravity: /\bagy -p\b/,
    claude: /\bclaude -p\b/,
    gemini: /\bgemini -p\b/,
    ollama: /\/ollama\/lib\/ollama\/llama-server\b/,
  };
  return Object.fromEntries(
    Object.entries(rules).map(([id, re]) => [id, lines.filter(line => re.test(line)).length])
  );
}

export function normalizeA2ATimeline(raw: unknown[]): A2AEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item: any) => item && typeof item === "object" && item.checkpoint_id && item.task_id)
    .sort((a: any, b: any) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
    .slice(-32)
    .map((item: any, index) => ({
      sequence: index + 1,
      taskId: text(item.task_id, "UNKNOWN"),
      stage: text(item.stage, "UNKNOWN").toUpperCase(),
      ownerAgent: text(item.owner_agent, "UNKNOWN").toUpperCase(),
      status: text(item.status, "UNKNOWN").toUpperCase(),
      completedWork: text(item.completed_work, "No verified action recorded"),
      nextStep: text(item.next_step, "NONE").toUpperCase(),
      createdAt: text(item.created_at, "UNKNOWN"),
      checkpointId: text(item.checkpoint_id, "UNKNOWN"),
    }));
}

export function deriveHandoffs(timeline: A2AEvent[]): A2AHandoff[] {
  return timeline.slice(1).map((event, index) => ({
    sequence: index + 1,
    taskId: event.taskId,
    fromAgent: timeline[index].ownerAgent,
    toAgent: event.ownerAgent,
    fromStage: timeline[index].stage,
    toStage: event.stage,
    timestamp: event.createdAt,
    status: event.status === "VERIFIED" ? "VERIFIED" : "OBSERVED",
  })).slice(-24);
}

export function deriveProviderAttempts(timeline: A2AEvent[]): ProviderAttempt[] {
  return timeline.flatMap(event => {
    const provider = event.ownerAgent.toLowerCase();
    if (!PROVIDERS.has(provider)) return [];
    return [{
      sequence: event.sequence,
      taskId: event.taskId,
      provider,
      role: stageRole(event.stage),
      stage: event.stage,
      status: event.status,
      timestamp: event.createdAt,
      checkpointId: event.checkpointId,
    }];
  }).slice(-24);
}

export function deriveRuntimeAgents(input: {
  supervisorState?: string;
  workExecution: any;
  runtimeWorkers: Record<string, number>;
  timeline: A2AEvent[];
}): RuntimeAgent[] {
  const taskId = text(input.workExecution?.currentTask, "NONE");
  const stage = text(input.workExecution?.stage, "UNKNOWN").toUpperCase();
  const currentRole = stageRole(stage);
  const nextRole = stageRole(input.workExecution?.nextAction);
  const roles = ["COORDINATOR", "PLANNER", "TEST_DESIGNER", "IMPLEMENTER", "REVIEWER", "DELIVERY"];
  const logical = roles.map(role => ({
    id: role === "COORDINATOR" ? "coordinator" : role.toLowerCase().replaceAll("_", "-"),
    role,
    kind: "ORCHESTRATION_ROLE",
    state: input.supervisorState === "WAITING_HUMAN" ? "WAITING_HUMAN" : role === currentRole ? "ORCHESTRATING" : role === nextRole ? "READY" : "IDLE",
    taskId,
    stage,
    lastAction: text(input.workExecution?.lastAction, ""),
    nextAction: text(input.workExecution?.nextAction, ""),
  }));
  const lastProvider = [...input.timeline].reverse()
    .find(event => event.taskId === taskId && PROVIDERS.has(event.ownerAgent.toLowerCase()));
  const providerRole = lastProvider
    ? stageRole(lastProvider.stage)
    : nextRole !== "COORDINATOR" ? nextRole : currentRole;
  const providers = Object.entries(input.runtimeWorkers)
    .filter(([, count]) => count > 0)
    .map(([provider]) => ({
      id: provider === "ollama" ? "ollama-local" : provider + "-worker",
      role: providerRole,
      provider,
      kind: "PROVIDER_WORKER",
      state: "PROCESS_PRESENT",
      taskId,
      stage,
    }));
  return [...logical, ...providers].slice(0, 16);
}
