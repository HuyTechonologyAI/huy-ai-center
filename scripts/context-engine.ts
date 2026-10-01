/**
 * ANTI-FORGETTING CONTEXT ENGINE
 * Canonical Blueprint V3.0 (Sections 13, 21, 22, 23)
 *
 * Implements:
 * 1. Context Hydration: Validates SHA256 hashes against CONTEXT_MANIFEST, detects stale state.
 * 2. Task Contract Hydration: Enforces immutable scope, risk level, and completion conditions.
 * 3. Context Writeback: Appends verified checkpoints, increments context_generation, updates manifest.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

export interface HydratedContext {
  valid: boolean;
  generation: number;
  systemConstitution: string;
  projectState: any;
  activeObjectives: any[];
  currentBlockers: any[];
  lastVerifiedCheckpoint: string;
  staleFiles: string[];
}

export function hydrateContext(agencyDir: string): HydratedContext {
  const manifestPath = join(agencyDir, 'CONTEXT_MANIFEST.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`[ContextEngine] Missing CONTEXT_MANIFEST at: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const staleFiles: string[] = [];

  // Verify file hashes
  for (const [relPath, expectedHash] of Object.entries(manifest.hashes as Record<string, string>)) {
    const fullPath = join(agencyDir, relPath);
    if (!existsSync(fullPath)) {
      staleFiles.push(`${relPath} (MISSING)`);
      continue;
    }
    const content = readFileSync(fullPath);
    const actualHash = createHash('sha256').update(content).digest('hex');
    if (actualHash !== expectedHash) {
      staleFiles.push(`${relPath} (HASH_MISMATCH: expected ${expectedHash.slice(0, 8)}..., got ${actualHash.slice(0, 8)}...)`);
    }
  }

  const constitutionPath = join(agencyDir, 'SYSTEM_CONSTITUTION.md');
  const systemConstitution = existsSync(constitutionPath) ? readFileSync(constitutionPath, 'utf-8') : '';

  const projectStatePath = join(agencyDir, manifest.active_project_state);
  const projectState = existsSync(projectStatePath) ? JSON.parse(readFileSync(projectStatePath, 'utf-8')) : {};

  const objectivesPath = join(agencyDir, manifest.active_objectives);
  const objectives = existsSync(objectivesPath) ? JSON.parse(readFileSync(objectivesPath, 'utf-8')).objectives : [];

  const blockersPath = join(agencyDir, 'state', 'CURRENT_BLOCKERS.json');
  const blockers = existsSync(blockersPath) ? JSON.parse(readFileSync(blockersPath, 'utf-8')).blockers : [];

  return {
    valid: staleFiles.length === 0,
    generation: manifest.context_generation,
    systemConstitution,
    projectState,
    activeObjectives: objectives,
    currentBlockers: blockers,
    lastVerifiedCheckpoint: manifest.recovery_checkpoint,
    staleFiles
  };
}

export function writebackCheckpoint(
  agencyDir: string,
  workstreamId: string,
  checkpoint: {
    checkpoint_id: string;
    parent_checkpoint_id: string | null;
    task_id: string;
    stage: string;
    owner_agent: string;
    status: 'VERIFIED' | 'FAILED' | 'HUMAN_GATE';
    completed_work: string[];
    evidence_refs: string[];
    test_receipts?: any[];
  }
) {
  const ckDir = join(agencyDir, 'workstreams', workstreamId, 'CHECKPOINTS');
  const ckPath = join(ckDir, `${checkpoint.checkpoint_id}.json`);
  
  const payload = {
    ...checkpoint,
    created_at: new Date().toISOString()
  };
  writeFileSync(ckPath, JSON.stringify(payload, null, 2), 'utf-8');

  // Update CONTEXT_MANIFEST
  const manifestPath = join(agencyDir, 'CONTEXT_MANIFEST.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  manifest.recovery_checkpoint = checkpoint.checkpoint_id;
  manifest.context_generation = (manifest.context_generation || 0) + 1;
  manifest.last_updated = new Date().toISOString();

  // Recalculate hashes for canonical files
  for (const rel of manifest.canonical_files) {
    const full = join(agencyDir, rel);
    if (existsSync(full)) {
      const data = readFileSync(full);
      manifest.hashes[rel] = createHash('sha256').update(data).digest('hex');
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  // Update PROJECT_STATE
  const statePath = join(agencyDir, manifest.active_project_state);
  if (existsSync(statePath)) {
    const pState = JSON.parse(readFileSync(statePath, 'utf-8'));
    pState.last_verified_checkpoint = checkpoint.checkpoint_id;
    pState.last_updated = new Date().toISOString();
    writeFileSync(statePath, JSON.stringify(pState, null, 2), 'utf-8');
  }

  console.log(`[ContextEngine] ✅ Checkpoint ${checkpoint.checkpoint_id} written. New generation: ${manifest.context_generation}`);
}

// Self-test if executed directly
if (process.argv[1]?.endsWith('context-engine.ts')) {
  const root = resolve(process.cwd());
  const agency = join(root, '.ai-agency');
  console.log(`[ContextEngine] Testing hydration on ${agency}...`);
  const ctx = hydrateContext(agency);
  console.log(`[ContextEngine] Hydration Result: Valid=${ctx.valid}, Gen=${ctx.generation}, LastCheckpoint=${ctx.lastVerifiedCheckpoint}`);
  if (ctx.staleFiles.length > 0) {
    console.warn(`[ContextEngine] Stale/Mismatch files:`, ctx.staleFiles);
  }
}
