/** Read-only status of the G0/G1 gates; never connects to production. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLiveAcceptance } from '../automation/agent-bridge/src/backlog-runner.js';
import { readLatestCheckpoint } from '../automation/agent-bridge/src/checkpoints.js';

type Gate = { status: 'VERIFIED' | 'BLOCKED' | 'REVIEW_REQUIRED'; evidence: string[]; missing: string[] };
export type ReadinessReport = {
  status: 'PARTIAL' | 'READY_FOR_REVIEW';
  g0: Gate;
  g1: Gate;
  migrationManifest: { file: string; sha256: string; matches: boolean }[];
};

export function checkReadiness(root: string): ReadinessReport {
  root = resolve(root);
  const packet = join(root, 'docs/architecture/06K_C0_READINESS_PACKET.md');
  if (!existsSync(packet)) throw Error('READINESS_PACKET_MISSING');
  const rows = [...readFileSync(packet, 'utf8').matchAll(
    /\| ([1-5]) \| `(2026092307000[1-5]_06k_b_[a-z_]+\.sql)` \| `([a-f0-9]{64})` \|/g
  )];
  if (rows.length !== 5 || rows.some((row, i) => Number(row[1]) !== i + 1 ||
    !row[2].startsWith(`2026092307000${i + 1}_`))) {
    throw Error('READINESS_MANIFEST_INVALID');
  }
  const migrationManifest = rows.map(([, , file, sha256]) => {
    const path = join(root, 'supabase/migrations', file);
    const actual = existsSync(path)
      ? createHash('sha256').update(readFileSync(path)).digest('hex') : '';
    return { file, sha256, matches: actual === sha256 };
  });

  const g0: Gate = { status: 'BLOCKED', evidence: [], missing: [] };
  try {
    assertLiveAcceptance(root);
    g0.status = 'VERIFIED';
    g0.evidence.push('.artifacts/agent-bridge/acceptance/');
  } catch {
    g0.missing.push('Authenticated E2E PASS receipt for unchanged bridge code');
  }

  const g1: Gate = { status: 'BLOCKED', evidence: [
    'docs/architecture/06K_C0_READINESS_PACKET.md',
  ], missing: [] };
  if (migrationManifest.some(item => !item.matches)) {
    g1.missing.push('Migration file differs from packet checksum');
  }
  try {
    const checkpoint = readLatestCheckpoint(root, '06k-c-readiness');
    if (checkpoint?.stage === 'DELIVERY') {
      g1.evidence.push(`.artifacts/agent-bridge/checkpoints/06k-c-readiness/${checkpoint.checkpoint_id}.json`);
      g1.status = 'REVIEW_REQUIRED';
    } else {
      g1.missing.push('Valid DELIVERY checkpoint for 06k-c-readiness');
    }
  } catch {
    g1.missing.push('Checkpoint is missing, stale or invalid; inspect evidence');
  }
  if (g0.status !== 'VERIFIED') g1.missing.push('G0 live acceptance');
  if (g1.missing.length) g1.status = 'BLOCKED';
  if (g1.status === 'REVIEW_REQUIRED') {
    g1.missing.push('Independent review of fresh production snapshot and tested backup restore');
  }
  return { status: g0.status === 'VERIFIED' && g1.status === 'REVIEW_REQUIRED'
    ? 'READY_FOR_REVIEW' : 'PARTIAL', g0, g1, migrationManifest };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    console.log(JSON.stringify(checkReadiness(process.cwd()), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'READINESS_CHECK_FAILED');
    process.exitCode = 2;
  }
}
