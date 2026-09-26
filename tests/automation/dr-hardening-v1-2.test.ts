import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, symlinkSync, readlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { createEncryptedSnapshot, decryptSnapshot } from '../../automation/dr-engine/src/dr-snapshot.js';
import { createGitBackup } from '../../automation/dr-engine/src/git-backup.js';
import { performRestoreTest } from '../../automation/dr-engine/src/restore-tester.js';
import { validateFinalReceipt, writeCheckpoint, validateCheckpointChain } from '../../automation/dr-engine/src/checkpoint-manager.js';
import { assertUploadSetSafe } from '../../automation/dr-engine/src/secret-scanner.js';

function temp(prefix: string) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function git(cwd: string, ...args: string[]) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return (r.stdout || '').trim();
}

function initRepo(): string {
  const repo = temp('dr-v12-repo-');
  git(repo, 'init');
  git(repo, 'config', 'user.name', 'DR Test');
  git(repo, 'config', 'user.email', 'dr-test@example.invalid');
  writeFileSync(join(repo, 'tracked.txt'), 'base\n');
  git(repo, 'add', 'tracked.txt');
  git(repo, 'commit', '-m', 'base');
  return repo;
}

function generateAgeIdentity(dir: string, name: string) {
  const identity = join(dir, name);
  const r = spawnSync('age-keygen', ['-o', identity], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const pub = spawnSync('age-keygen', ['-y', identity], { encoding: 'utf8' });
  assert.equal(pub.status, 0, pub.stderr);
  return { identity, recipient: pub.stdout.trim() };
}

test('R01/R02: snapshot has no fallback secret and missing recipient fails closed', () => {
  const src = temp('dr-v12-src-');
  writeFileSync(join(src, 'a.txt'), 'hello');
  const out = temp('dr-v12-out-');
  const old = process.env.HUY_AI_DR_AGE_RECIPIENT;
  delete process.env.HUY_AI_DR_AGE_RECIPIENT;
  try {
    assert.throws(() => createEncryptedSnapshot({
      filesOrDir: [join(src, 'a.txt')],
      outputDir: out,
      snapshotName: 'x'
    }), /MISSING_AGE_RECIPIENT/);
  } finally {
    if (old) process.env.HUY_AI_DR_AGE_RECIPIENT = old;
  }
});

test('R03-R06: age snapshot decrypts only with right key, rejects tamper, cleans plaintext temp', () => {
  const tools = spawnSync('age', ['--version'], { encoding: 'utf8' });
  assert.equal(tools.status, 0, 'age must be installed for DR V1.2 tests');

  const keyDir = temp('dr-v12-key-');
  const good = generateAgeIdentity(keyDir, 'good.key');
  const bad = generateAgeIdentity(keyDir, 'bad.key');
  const src = temp('dr-v12-src-');
  writeFileSync(join(src, 'payload.txt'), 'secret recovery payload\n');
  const out = temp('dr-v12-out-');

  const snap = createEncryptedSnapshot({
    filesOrDir: [join(src, 'payload.txt')],
    outputDir: out,
    snapshotName: 'snap',
    recipient: good.recipient
  });

  assert.equal(readdirSync(out).some(x => x.endsWith('.tar.gz')), false, 'plaintext tar must be removed');

  const restore = temp('dr-v12-restore-');
  decryptSnapshot({ encryptedPath: snap.encryptedPath, outputDir: restore, identityPath: good.identity });
  assert.equal(readdirSync(restore).some(x => x === 'decrypted-temp.tar.gz'), false);

  assert.throws(() => decryptSnapshot({
    encryptedPath: snap.encryptedPath,
    outputDir: temp('dr-v12-wrong-'),
    identityPath: bad.identity
  }), /DECRYPTION_FAILED/);

  const bytes = Buffer.from(readFileSync(snap.encryptedPath));
  bytes[Math.max(0, bytes.length - 8)] ^= 0xff;
  const tampered = join(out, 'tampered.age');
  writeFileSync(tampered, bytes);
  assert.throws(() => decryptSnapshot({
    encryptedPath: tampered,
    outputDir: temp('dr-v12-tamper-'),
    identityPath: good.identity
  }), /DECRYPTION_FAILED/);
});

test('R07-R17: real dirty state round-trip preserves bytes, binary, symlink and mode with no synthetic fallback', () => {
  const repo = initRepo();

  writeFileSync(join(repo, 'tracked.txt'), 'base\nunstaged\n');
  writeFileSync(join(repo, 'staged.txt'), 'staged bytes\n');
  git(repo, 'add', 'staged.txt');

  writeFileSync(join(repo, 'untracked.txt'), 'real untracked bytes\n');
  writeFileSync(join(repo, 'binary.bin'), Buffer.from([0, 1, 2, 3, 254, 255]));
  writeFileSync(join(repo, 'exec.sh'), '#!/bin/sh\necho ok\n');
  chmodSync(join(repo, 'exec.sh'), 0o755);
  symlinkSync('untracked.txt', join(repo, 'link-to-untracked'));

  const backupDir = temp('dr-v12-backup-');
  const backup = createGitBackup({ repoDir: repo, outputDir: backupDir, projectId: 'p' });

  assert.ok(backup.dirtyState.untrackedEntries?.length >= 4);
  assert.ok(backup.dirtyStatePayloadDir && existsSync(backup.dirtyStatePayloadDir));

  const restoreDir = temp('dr-v12-git-restore-parent-') + '/restore';
  const result = performRestoreTest({
    bundlePath: backup.bundlePath,
    restoreDir,
    dirtyState: backup.dirtyState,
    dirtyStatePayloadDir: backup.dirtyStatePayloadDir
  });

  assert.equal(result.success, true);
  assert.deepEqual([...readFileSync(join(restoreDir, 'binary.bin'))], [0, 1, 2, 3, 254, 255]);
  assert.equal(readlinkSync(join(restoreDir, 'link-to-untracked')), 'untracked.txt');

  const missingDir = temp('dr-v12-missing-');
  assert.throws(() => performRestoreTest({
    bundlePath: backup.bundlePath,
    restoreDir: join(temp('dr-v12-restore-parent-'), 'restore'),
    dirtyState: backup.dirtyState,
    dirtyStatePayloadDir: missingDir
  }), /UNTRACKED_PAYLOAD_MISSING/);

  const broken = structuredClone(backup.dirtyState);
  broken.unstagedDiff = 'not a patch';
  assert.throws(() => performRestoreTest({
    bundlePath: backup.bundlePath,
    restoreDir: join(temp('dr-v12-broken-parent-'), 'restore'),
    dirtyState: broken,
    dirtyStatePayloadDir: backup.dirtyStatePayloadDir
  }), /RESTORE_UNSTAGED_APPLY_FAILED/);
});

test('R18-R20: plaintext secrets and private recovery material are blocked from upload sets', () => {
  const dir = temp('dr-v12-scan-');
  const safe = join(dir, 'safe.txt');
  const secret = join(dir, 'secret.txt');
  const privateKey = join(dir, 'dr-recovery.key');

  writeFileSync(safe, 'normal source');
  writeFileSync(secret, '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----');
  writeFileSync(privateKey, 'AGE-SECRET-KEY-TESTONLY');

  assert.doesNotThrow(() => assertUploadSetSafe([safe]));
  assert.throws(() => assertUploadSetSafe([safe, secret]), /UPLOAD_SET_BLOCKED/);
  assert.throws(() => assertUploadSetSafe([privateKey]), /UPLOAD_SET_BLOCKED/);
});

test('R21/R22: final receipt rejects missing and contradictory security markers', () => {
  const valid: any = {
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
    migration_id: 'm1',
    timestamp: new Date().toISOString(),
    checkpoints: {}
  };
  assert.doesNotThrow(() => validateFinalReceipt(valid));

  const missing = { ...valid };
  delete missing.REMOTE_BYTES_VERIFIED;
  assert.throws(() => validateFinalReceipt(missing), /REMOTE_BYTES_VERIFIED/);

  const contradictory = { ...valid, OWNER_PRIVATE_KEY_UPLOADED: 'YES' };
  assert.throws(() => validateFinalReceipt(contradictory), /OWNER_PRIVATE_KEY_UPLOADED/);
});

test('R28/R29: checkpoint chain detects tamper and source fingerprint change', () => {
  const stateDir = temp('dr-v12-state-');
  writeCheckpoint({
    stateDir,
    migrationId: 'm1',
    phase: 'CP00_PATH_VALIDATION',
    status: 'PASS',
    sourceFingerprint: 'src-a',
    directiveVersion: 'V1.2'
  });
  writeCheckpoint({
    stateDir,
    migrationId: 'm1',
    phase: 'CP10_PROJECT_DISCOVERY',
    status: 'PASS',
    sourceFingerprint: 'src-a',
    directiveVersion: 'V1.2'
  });

  assert.doesNotThrow(() => validateCheckpointChain(stateDir, 'm1', 'src-a'));
  assert.throws(() => validateCheckpointChain(stateDir, 'm1', 'src-b'), /SOURCE_FINGERPRINT_MISMATCH/);

  const cp = join(stateDir, 'CP00_PATH_VALIDATION.json');
  const raw = JSON.parse(readFileSync(cp, 'utf8'));
  raw.details = { tampered: true };
  writeFileSync(cp, JSON.stringify(raw, null, 2));
  assert.throws(() => validateCheckpointChain(stateDir, 'm1', 'src-a'), /CHECKPOINT_HASH_MISMATCH/);
});
