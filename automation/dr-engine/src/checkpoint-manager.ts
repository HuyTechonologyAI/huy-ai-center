import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { CheckpointRecord, FinalReceipt } from './types.js';

const PHASE_ORDER = [
  'CP00_PATH_VALIDATION',
  'CP10_PROJECT_DISCOVERY',
  'CP20_CLASSIFICATION',
  'CP30_GIT_STATE',
  'CP30_DR_SNAPSHOT',
  'CP40_DR_SNAPSHOT',
  'CP40_GITHUB_DESTINATION',
  'CP50_GITHUB_DESTINATION',
  'CP50_GITHUB_UPLOAD',
  'CP60_RESTORE_TEST',
  'CP70_NODE01_TOOLKIT'
];

function hashRecord(record: CheckpointRecord): string {
  const clone: Record<string, unknown> = { ...record };
  delete clone.record_sha256;
  return createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

function latestCheckpointPath(stateDir: string): string {
  return join(stateDir, 'PROJECT_STATE.json');
}

export function writeCheckpoint(options: {
  stateDir: string;
  migrationId: string;
  phase: string;
  status: 'PENDING' | 'RUNNING' | 'PASS' | 'COMPLETED' | 'FAILED';
  directiveVersion?: string;
  sourceFingerprint?: string;
  sourceManifestSha256?: string;
  artifactManifestSha256?: string;
  githubReceipt?: Record<string, any>;
  tests?: Record<string, any>;
  humanGate?: any;
  details?: Record<string, any>;
}): CheckpointRecord {
  const { stateDir, migrationId, phase, status, details } = options;

  if (!PHASE_ORDER.includes(phase)) {
    throw new Error(`CHECKPOINT_PHASE_UNKNOWN: ${phase}`);
  }

  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

  let previous: CheckpointRecord | null = null;
  const stateFile = latestCheckpointPath(stateDir);
  if (existsSync(stateFile)) {
    previous = JSON.parse(readFileSync(stateFile, 'utf8'));
    if (previous.migration_id !== migrationId) {
      throw new Error('CHECKPOINT_MIGRATION_ID_MISMATCH');
    }
    const prevIdx = PHASE_ORDER.indexOf(previous.phase);
    const nextIdx = PHASE_ORDER.indexOf(phase);
    if (nextIdx < prevIdx) {
      throw new Error(`CHECKPOINT_PHASE_REGRESSION: ${previous.phase} -> ${phase}`);
    }
    if (
      options.sourceFingerprint &&
      previous.source_fingerprint &&
      options.sourceFingerprint !== previous.source_fingerprint
    ) {
      throw new Error('SOURCE_FINGERPRINT_MISMATCH');
    }
  }

  const record: CheckpointRecord = {
    migration_id: migrationId,
    phase,
    status,
    completed_at: new Date().toISOString(),
    directive_version: options.directiveVersion,
    source_fingerprint: options.sourceFingerprint || previous?.source_fingerprint,
    previous_checkpoint_sha256: previous?.record_sha256,
    source_manifest_sha256: options.sourceManifestSha256,
    artifact_manifest_sha256: options.artifactManifestSha256,
    github_receipt: options.githubReceipt || {},
    tests: options.tests || {},
    human_gate: options.humanGate || null,
    details: details || {}
  };
  record.record_sha256 = hashRecord(record);

  const checkpointFile = join(stateDir, `${phase}.json`);
  if (existsSync(checkpointFile)) {
    const existing: CheckpointRecord = JSON.parse(readFileSync(checkpointFile, 'utf8'));
    if (existing.record_sha256 !== record.record_sha256) {
      throw new Error(`CHECKPOINT_APPEND_ONLY_VIOLATION: ${phase}`);
    }
  } else {
    writeFileSync(checkpointFile, JSON.stringify(record, null, 2));
  }

  writeFileSync(stateFile, JSON.stringify(record, null, 2));
  return record;
}

export function readCheckpoint(stateDir: string, migrationId: string, phase?: string): CheckpointRecord | null {
  if (!existsSync(stateDir)) return null;

  const p = phase ? join(stateDir, `${phase}.json`) : latestCheckpointPath(stateDir);
  if (!existsSync(p)) return null;

  const record: CheckpointRecord = JSON.parse(readFileSync(p, 'utf8'));
  if (record.migration_id !== migrationId) return null;
  return record;
}

export function canResumeFromCheckpoint(
  checkpoint: CheckpointRecord | null,
  targetPhase: string,
  expectedSourceFingerprint?: string
): boolean {
  if (!checkpoint) return false;
  if (checkpoint.status !== 'PASS' && checkpoint.status !== 'COMPLETED') return false;
  if (!PHASE_ORDER.includes(targetPhase)) return false;
  if (
    expectedSourceFingerprint &&
    checkpoint.source_fingerprint &&
    expectedSourceFingerprint !== checkpoint.source_fingerprint
  ) return false;
  return true;
}

export function validateCheckpointChain(
  stateDir: string,
  migrationId: string,
  expectedSourceFingerprint?: string
): void {
  let previousHash: string | undefined;
  let seen = false;

  for (const phase of PHASE_ORDER) {
    const p = join(stateDir, `${phase}.json`);
    if (!existsSync(p)) continue;

    seen = true;
    const record: CheckpointRecord = JSON.parse(readFileSync(p, 'utf8'));

    if (record.migration_id !== migrationId) {
      throw new Error(`CHECKPOINT_MIGRATION_ID_MISMATCH: ${phase}`);
    }

    if (
      expectedSourceFingerprint &&
      record.source_fingerprint &&
      record.source_fingerprint !== expectedSourceFingerprint
    ) {
      throw new Error(`SOURCE_FINGERPRINT_MISMATCH: ${phase}`);
    }

    const actual = hashRecord(record);
    if (!record.record_sha256 || actual !== record.record_sha256) {
      throw new Error(`CHECKPOINT_HASH_MISMATCH: ${phase}`);
    }

    if (record.previous_checkpoint_sha256 !== previousHash) {
      throw new Error(`CHECKPOINT_PREDECESSOR_MISMATCH: ${phase}`);
    }

    previousHash = record.record_sha256;
  }

  if (!seen) throw new Error('CHECKPOINT_CHAIN_EMPTY');
}

export function validateFinalReceipt(receipt: Partial<FinalReceipt>): void {
  const expected: Record<keyof FinalReceipt, unknown> = {
    DR_V1_1_SECURITY_STATUS: 'QUARANTINED',
    DR_V1_2_CRYPTO: 'PASS',
    DR_RECOVERY_KEY_CUSTODY: 'PASS',
    ALL_PROJECTS_COVERED: 'PASS',
    SECRET_SCAN: 'PASS',
    PROHIBITED_DATA_EXCLUDED: 'PASS',
    REMOTE_BYTES_VERIFIED: 'PASS',
    REAL_DIRTY_STATE_RESTORE: 'PASS',
    FALSE_PASS_FALLBACKS: 'ZERO',
    GITHUB_DR: 'PASS',
    RESTORE_TEST: 'PASS',
    NODE01_MIGRATION_TOOLKIT: 'READY',
    SOURCE_DATA_DELETED: 'NO',
    OWNER_PRIVATE_KEY_UPLOADED: 'NO',
    PLAINTEXT_SECRET_UPLOADED: 'NO',
    DATA2_MUTATED: 'NO',
    NODE01_AUTHORITATIVE_CUTOVER: 'NOT_EXECUTED',
    SAFE_TO_START_NODE01_MIGRATION: 'YES',
    migration_id: '__NONEMPTY__',
    timestamp: '__NONEMPTY__',
    checkpoints: '__OBJECT__'
  };

  for (const [key, wanted] of Object.entries(expected) as Array<[keyof FinalReceipt, unknown]>) {
    const actual = receipt[key];

    if (wanted === '__NONEMPTY__') {
      if (typeof actual !== 'string' || actual.trim() === '') {
        throw new Error(`RECEIPT_VALIDATION_ERROR: INCOMPLETE_RECEIPT_CANNOT_PASS - marker '${key}' must be non-empty`);
      }
      continue;
    }

    if (wanted === '__OBJECT__') {
      if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
        throw new Error(`RECEIPT_VALIDATION_ERROR: INCOMPLETE_RECEIPT_CANNOT_PASS - marker '${key}' must be an object`);
      }
      continue;
    }

    if (actual !== wanted) {
      throw new Error(
        `RECEIPT_VALIDATION_ERROR: INCOMPLETE_RECEIPT_CANNOT_PASS - marker '${key}' expected '${String(wanted)}' but got '${String(actual)}'`
      );
    }
  }
}
