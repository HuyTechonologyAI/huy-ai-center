/** Append-only, verified checkpoints for the serial A2A runner. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

export type Stage = 'RECEIVED' | 'PLAN' | 'DECOMPOSITION' | 'TEST_DESIGN' | 'IMPLEMENTATION' | 'CROSS_REVIEW' | 'DELIVERY';
const stages: Stage[] = ['RECEIVED', 'PLAN', 'DECOMPOSITION', 'TEST_DESIGN', 'IMPLEMENTATION', 'CROSS_REVIEW', 'DELIVERY'];
export interface Checkpoint {
  checkpoint_id: string;
  task_id: string;
  subtask_id: string;
  stage: Stage;
  status: 'VERIFIED';
  created_at: string;
  owner_agent: string;
  previous_checkpoint_id: string | null;
  objective: string;
  completed_work: string;
  artifact_locations: string[];
  artifact_version_or_hash: string;
  verification_commands_or_methods: string[];
  verification_results: string[];
  evidence_locations: string[];
  dependencies_and_versions: Record<string, string>;
  external_actions_and_receipts: string[];
  known_limitations: string[];
  next_step: string;
  recovery_instructions: string;
}

function atomicJson(path: string, record: unknown): void {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  renameSync(temp, path);
}

export function readLatestCheckpoint(root: string, taskId: string): Checkpoint | undefined {
  const dir = join(root, '.artifacts/agent-bridge/checkpoints', taskId);
  const pointer = join(dir, 'latest.json');
  if (!existsSync(pointer)) return undefined;
  const { checkpoint_id } = JSON.parse(readFileSync(pointer, 'utf8')) as { checkpoint_id: string };
  if (!/^[a-f0-9]{64}$/.test(checkpoint_id)) throw Error('INVALID_CHECKPOINT_POINTER');
  const record = JSON.parse(readFileSync(join(dir, `${checkpoint_id}.json`), 'utf8')) as Checkpoint;
  if (record.checkpoint_id !== checkpoint_id || record.status !== 'VERIFIED') throw Error('INVALID_CHECKPOINT');
  if (record.artifact_locations.length !== 1 ||
      !record.artifact_locations[0].startsWith(`.artifacts/agent-bridge/checkpoints/${taskId}/evidence-`) ||
      !existsSync(join(root, record.artifact_locations[0]))) throw Error('CHECKPOINT_ARTIFACT_MISSING');
  const actual = createHash('sha256').update(readFileSync(join(root, record.artifact_locations[0]))).digest('hex');
  if (actual !== record.artifact_version_or_hash) throw Error('CHECKPOINT_ARTIFACT_STALE');
  return record;
}

export function saveVerifiedCheckpoint(root: string, record: Omit<Checkpoint, 'checkpoint_id' | 'status' | 'created_at' | 'previous_checkpoint_id'>): Checkpoint {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(record.task_id) || !record.artifact_version_or_hash ||
      !record.verification_results.length || !record.evidence_locations.length) throw Error('CHECKPOINT_EVIDENCE_REQUIRED');
  const dir = join(root, '.artifacts/agent-bridge/checkpoints', record.task_id);
  mkdirSync(dir, { recursive: true });
  const previous = readLatestCheckpoint(root, record.task_id);
  if (stages.indexOf(record.stage) !== (previous ? stages.indexOf(previous.stage) + 1 : 0)) throw Error('CHECKPOINT_STAGE_ORDER');
  const payload = { ...record, status: 'VERIFIED' as const, created_at: new Date().toISOString(), previous_checkpoint_id: previous?.checkpoint_id ?? null };
  const checkpoint_id = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const checkpoint: Checkpoint = { ...payload, checkpoint_id };
  atomicJson(join(dir, `${checkpoint_id}.json`), checkpoint);
  atomicJson(join(dir, 'latest.json'), { checkpoint_id });
  return checkpoint;
}

/** An immutable evidence snapshot is saved before publishing its checkpoint pointer. */
export function checkpointStage(root: string, params: {
  taskId: string; stage: Stage; owner: string; objective: string;
  evidence: unknown; method: string; result: string; next: string;
  dependencies?: Record<string, string>; receipts?: string[];
}): Checkpoint {
  const existing = readLatestCheckpoint(root, params.taskId);
  if (existing) {
    const existingIndex = stages.indexOf(existing.stage);
    const requestedIndex = stages.indexOf(params.stage);
    if (requestedIndex < 0) throw Error('CHECKPOINT_STAGE_UNKNOWN');
    if (requestedIndex <= existingIndex) {
      // Restart/resume is idempotent: never rewrite or fork already-verified history.
      if (existing.task_id !== params.taskId || existing.objective !== params.objective) {
        throw Error('CHECKPOINT_RESUME_IDENTITY_MISMATCH');
      }
      return existing;
    }
    if (requestedIndex !== existingIndex + 1) {
      throw Error('CHECKPOINT_STAGE_GAP');
    }
  }

  const dir = join(root, '.artifacts/agent-bridge/checkpoints', params.taskId);
  mkdirSync(dir, { recursive: true });
  const body = JSON.stringify(params.evidence, null, 2) + '\n';
  const hash = createHash('sha256').update(body).digest('hex');
  const relative = `.artifacts/agent-bridge/checkpoints/${params.taskId}/evidence-${hash}.json`;
  const evidencePath = join(root, relative);
  if (!existsSync(evidencePath)) writeFileSync(evidencePath, body, { flag: 'wx', mode: 0o600 });
  return saveVerifiedCheckpoint(root, {
    task_id: params.taskId, subtask_id: `${params.taskId}-${params.stage.toLowerCase()}`,
    stage: params.stage, owner_agent: params.owner, objective: params.objective,
    completed_work: params.result, artifact_locations: [relative], artifact_version_or_hash: hash,
    verification_commands_or_methods: [params.method], verification_results: [params.result],
    evidence_locations: [relative], dependencies_and_versions: params.dependencies ?? {},
    external_actions_and_receipts: params.receipts ?? [], known_limitations: [], next_step: params.next,
    recovery_instructions: 'Verify latest checkpoint and evidence hash; inspect worktree and receipts before resuming.',
  });
}
