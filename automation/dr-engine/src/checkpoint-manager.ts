import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckpointRecord, FinalReceipt } from './types.js';
import { syncFileToNode01 } from './node01-sync.js';

const PHASE_ORDER = [
  'CP00_PATH_VALIDATION',
  'CP10_PROJECT_DISCOVERY',
  'CP20_CLASSIFICATION',
  'CP30_GIT_STATE',
  'CP40_DR_SNAPSHOT',
  'CP50_GITHUB_DESTINATION',
  'CP50_GITHUB_UPLOAD',
  'CP60_RESTORE_TEST',
  'CP70_NODE01_TOOLKIT'
];

export function writeCheckpoint(options: {
  stateDir: string;
  migrationId: string;
  phase: string;
  status: 'PENDING' | 'RUNNING' | 'PASS' | 'COMPLETED' | 'FAILED';
  sourceManifestSha256?: string;
  artifactManifestSha256?: string;
  githubReceipt?: Record<string, any>;
  tests?: Record<string, any>;
  humanGate?: any;
  details?: Record<string, any>;
}): CheckpointRecord {
  const { stateDir, migrationId, phase, status, details } = options;
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  const record: CheckpointRecord = {
    migration_id: migrationId,
    phase,
    status,
    completed_at: new Date().toISOString(),
    source_manifest_sha256: options.sourceManifestSha256,
    artifact_manifest_sha256: options.artifactManifestSha256,
    github_receipt: options.githubReceipt || {},
    tests: options.tests || {},
    human_gate: options.humanGate || null,
    details: details || {}
  };

  const checkpointFile = join(stateDir, `${phase}.json`);
  writeFileSync(checkpointFile, JSON.stringify(record, null, 2));

  // Also update latest project state
  const stateFile = join(stateDir, 'PROJECT_STATE.json');
  writeFileSync(stateFile, JSON.stringify(record, null, 2));

  // Authoritative Storage: Auto-sync checkpoint to Node-01
  try {
    syncFileToNode01(checkpointFile);
    syncFileToNode01(stateFile);
  } catch {
    // Non-blocking fallback if transport temporarily offline
  }

  return record;
}

export function readCheckpoint(stateDir: string, migrationId: string, phase?: string): CheckpointRecord | null {
  if (!existsSync(stateDir)) return null;

  if (phase) {
    const p = join(stateDir, `${phase}.json`);
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf8'));
    }
  }

  const latestState = join(stateDir, 'PROJECT_STATE.json');
  if (existsSync(latestState)) {
    return JSON.parse(readFileSync(latestState, 'utf8'));
  }

  return null;
}

export function canResumeFromCheckpoint(checkpoint: CheckpointRecord | null, targetPhase: string): boolean {
  if (!checkpoint) return false;
  if (checkpoint.status !== 'PASS' && checkpoint.status !== 'COMPLETED') return false;
  return true;
}

export function validateFinalReceipt(receipt: Partial<FinalReceipt>): void {
  const mandatory: Array<keyof FinalReceipt> = [
    'GITHUB_DR',
    'RESTORE_TEST',
    'NODE01_MIGRATION_TOOLKIT',
    'SOURCE_DATA_DELETED',
    'SAFE_TO_START_NODE01_MIGRATION'
  ];

  for (const m of mandatory) {
    const val = receipt[m];
    if (!val || val === 'NOT_RUN' || val === 'FAIL' || val === 'NOT_READY' || val === 'NO' && m === 'SAFE_TO_START_NODE01_MIGRATION') {
      throw new Error(`RECEIPT_VALIDATION_ERROR: INCOMPLETE_RECEIPT_CANNOT_PASS - marker '${m}' has invalid value '${val}'`);
    }
  }
}
