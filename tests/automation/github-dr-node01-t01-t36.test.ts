import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Modules to be implemented
import {
  assertSafeStoragePath,
  assertSafeExtractionPath,
  assertSafeNode01Target,
  assertSafeRefPush,
  assertSourcePreserved
} from '../../automation/dr-engine/src/path-guard.js';

import {
  scanAndClassifyFile,
  scanProjectFiles,
  detectSecretsInContent,
  FileClassification
} from '../../automation/dr-engine/src/secret-scanner.js';

import {
  discoverProjects,
  isProjectDirectory,
  isExcludedUserProfileArea
} from '../../automation/dr-engine/src/project-discovery.js';

import {
  createGitBackup,
  verifyGitBundle,
  verifyGitFsck,
  captureDirtyState
} from '../../automation/dr-engine/src/git-backup.js';

import {
  createEncryptedSnapshot,
  verifySnapshotShards,
  decryptSnapshot
} from '../../automation/dr-engine/src/dr-snapshot.js';

import {
  validateDRRepoVisibility,
  verifyRemoteHashes
} from '../../automation/dr-engine/src/github-backup.js';

import {
  performRestoreTest
} from '../../automation/dr-engine/src/restore-tester.js';

import {
  createMigrationPackage,
  verifyMigrationPackage,
  promoteCandidate,
  rollbackCandidate,
  checkTailscaleTransport
} from '../../automation/dr-engine/src/node01-toolkit.js';

import {
  writeCheckpoint,
  readCheckpoint,
  canResumeFromCheckpoint,
  validateFinalReceipt
} from '../../automation/dr-engine/src/checkpoint-manager.js';

function createTempGitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dr-test-git-'));
  const git = (...args: string[]) => {
    const res = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  };
  git('init');
  git('config', 'user.name', 'DR Tester');
  git('config', 'user.email', 'dr@huyai.local');
  writeFileSync(join(dir, 'README.md'), '# Fixture Repo\n');
  git('add', 'README.md');
  git('commit', '-m', 'Initial commit');
  return dir;
}

describe('GitHub DR & Node01 Migration Test Suite (T01 - T36)', () => {
  // --- Group 1: Git State & Bundle Verification (T01 - T07) ---
  describe('Git State & Bundle Verification (T01 - T07)', () => {
    it('T01 clean repo: backups clean repo with correct bundle and hashes', () => {
      const repoDir = createTempGitRepo();
      const outDir = mkdtempSync(join(tmpdir(), 'dr-out-t01-'));
      const backup = createGitBackup({ repoDir, outputDir: outDir, projectId: 'test-p1' });
      assert.ok(existsSync(backup.bundlePath));
      assert.ok(backup.sha256 && backup.sha256.length === 64);
      assert.equal(verifyGitBundle(backup.bundlePath), true);
      rmSync(repoDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    });

    it('T02 dirty tracked file: captures unstaged modifications in dirty-state backup', () => {
      const repoDir = createTempGitRepo();
      writeFileSync(join(repoDir, 'README.md'), '# Modified README\n');
      const dirty = captureDirtyState(repoDir);
      assert.equal(dirty.hasUnstagedChanges, true);
      assert.ok(dirty.unstagedDiff.includes('Modified README'));
      rmSync(repoDir, { recursive: true, force: true });
    });

    it('T03 staged file: captures staged modifications in dirty-state backup', () => {
      const repoDir = createTempGitRepo();
      writeFileSync(join(repoDir, 'staged.txt'), 'staged content\n');
      spawnSync('git', ['add', 'staged.txt'], { cwd: repoDir });
      const dirty = captureDirtyState(repoDir);
      assert.equal(dirty.hasStagedChanges, true);
      assert.ok(dirty.stagedDiff.includes('staged content'));
      rmSync(repoDir, { recursive: true, force: true });
    });

    it('T04 untracked source file: captures untracked project files in manifest/snapshot', () => {
      const repoDir = createTempGitRepo();
      writeFileSync(join(repoDir, 'untracked.ts'), 'export const x = 1;\n');
      const dirty = captureDirtyState(repoDir);
      assert.ok(dirty.untrackedFiles.includes('untracked.ts'));
      rmSync(repoDir, { recursive: true, force: true });
    });

    it('T05 multiple worktrees: preserves worktree metadata and branch mappings', () => {
      const repoDir = createTempGitRepo();
      const wtDir = mkdtempSync(join(tmpdir(), 'dr-wt-'));
      spawnSync('git', ['branch', 'feature/test-b'], { cwd: repoDir });
      spawnSync('git', ['worktree', 'add', wtDir, 'feature/test-b'], { cwd: repoDir });
      const dirty = captureDirtyState(repoDir);
      assert.ok(dirty.worktrees.length >= 2);
      spawnSync('git', ['worktree', 'remove', '--force', wtDir], { cwd: repoDir });
      rmSync(repoDir, { recursive: true, force: true });
      rmSync(wtDir, { recursive: true, force: true });
    });

    it('T06 tags/branches: preserves all tags, local branches, and refs in bundle', () => {
      const repoDir = createTempGitRepo();
      spawnSync('git', ['tag', 'v1.0.0'], { cwd: repoDir });
      spawnSync('git', ['branch', 'release/1.0'], { cwd: repoDir });
      const outDir = mkdtempSync(join(tmpdir(), 'dr-out-t06-'));
      const backup = createGitBackup({ repoDir, outputDir: outDir, projectId: 'test-p6' });
      assert.ok(backup.refs.tags.includes('refs/tags/v1.0.0'));
      assert.ok(backup.refs.heads.some(h => h.includes('release/1.0')));
      rmSync(repoDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    });

    it('T07 bundle corruption: fails closed and detects corrupted git bundle', () => {
      const outDir = mkdtempSync(join(tmpdir(), 'dr-out-t07-'));
      const fakeBundle = join(outDir, 'corrupt.bundle');
      writeFileSync(fakeBundle, 'CORRUPTED_BUNDLE_DATA_HEADER');
      assert.equal(verifyGitBundle(fakeBundle), false);
      rmSync(outDir, { recursive: true, force: true });
    });
  });

  // --- Group 2: Security & Remote Guard Policies (T08 - T15) ---
  describe('Security & Remote Guard Policies (T08 - T15)', () => {
    it('T08 remote hash mismatch: fails closed on remote checksum mismatch', () => {
      const localHashes = { 'fileA': 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' };
      const remoteHashes = { 'fileA': '0000001234567890abcdef1234567890abcdef1234567890abcdef1234567890' };
      assert.throws(() => {
        verifyRemoteHashes(localHashes, remoteHashes);
      }, /REMOTE_HASH_MISMATCH/);
    });

    it('T09 plaintext .env blocked: secret scanner blocks plaintext .env / credentials', () => {
      const classification = scanAndClassifyFile('.env.production', 'DATABASE_URL=postgres://user:pass@host/db\n');
      assert.equal(classification.category, FileClassification.DR_ENCRYPTED);
      assert.equal(classification.prohibitedForPlaintextGit, true);
    });

    it('T10 high-entropy token blocked: secret scanner blocks tokens (ghp_, sk-, bearer, etc.)', () => {
      const leakContent = 'const token = "ghp_123456789012345678901234567890123456";';
      const detected = detectSecretsInContent(leakContent);
      assert.equal(detected.hasSecret, true);
      assert.ok(detected.findings.some(f => f.type === 'GITHUB_PAT'));
    });

    it('T11 owner private key blocked: blocks .huy-ai/owner_gate_ed25519 from upload', () => {
      const classification = scanAndClassifyFile('.huy-ai/owner_gate_ed25519', 'PRIVATE KEY CONTENT');
      assert.equal(classification.category, FileClassification.PROHIBITED);
      assert.equal(classification.uploadAllowed, false);
    });

    it('T12 public DR repo rejected: rejects any DR repository that is public', () => {
      assert.throws(() => {
        validateDRRepoVisibility({ name: 'HuyTechonologyAI/HUY-AI-DISASTER-RECOVERY', isPrivate: false });
      }, /PUBLIC_DR_REPO_REJECTED/);
    });

    it('T13 private DR repo accepted: accepts private DR repository', () => {
      assert.doesNotThrow(() => {
        validateDRRepoVisibility({ name: 'HuyTechonologyAI/HUY-AI-DISASTER-RECOVERY', isPrivate: true });
      });
    });

    it('T14 force-push rejected: security policy blocks --force / -f', () => {
      assert.throws(() => {
        assertSafeRefPush(['push', 'origin', 'main', '--force']);
      }, /FORCE_PUSH_DENIED/);
      assert.throws(() => {
        assertSafeRefPush(['push', 'origin', 'feature/test', '-f']);
      }, /FORCE_PUSH_DENIED/);
    });

    it('T15 source deletion rejected: source deletion / rm -rf source is strictly DENIED', () => {
      assert.throws(() => {
        assertSourcePreserved(['rm', '-rf', '/home/huyai007/workspace/huy-ai-center']);
      }, /SOURCE_DELETION_DENIED/);
    });
  });

  // --- Group 3: Path Guards, Snapshots & Resumption (T16 - T22) ---
  describe('Path Guards, Snapshots & Resumption (T16 - T22)', () => {
    it('T16 /mnt/data2 rejected: any operation targeting /mnt/data2 or /mnt/data2/** is rejected with R4 PROTECTED', () => {
      assert.throws(() => {
        assertSafeStoragePath('/mnt/data2');
      }, /R4_PROTECTED_DATA2/);
      assert.throws(() => {
        assertSafeStoragePath('/mnt/data2/sub/folder');
      }, /R4_PROTECTED_DATA2/);
    });

    it('T17 Windows target rejected for Node01 canonical: Node01 canonical target cannot be a Windows mount (/mnt/c etc.)', () => {
      assert.throws(() => {
        assertSafeNode01Target('/mnt/c/Projects/HUY-AI-Center');
      }, /WINDOWS_TARGET_REJECTED_FOR_NODE01/);
      assert.doesNotThrow(() => {
        assertSafeNode01Target('/mnt/data1/Projects/HUY-AI-Center');
      });
    });

    it('T18 archive traversal rejected: packages/extractors reject ../ path traversal', () => {
      assert.throws(() => {
        assertSafeExtractionPath('/target/dir', '../../etc/passwd');
      }, /PATH_TRAVERSAL_DETECTED/);
    });

    it('T19 symlink escape rejected: reject symlinks pointing outside target directory', () => {
      assert.throws(() => {
        assertSafeExtractionPath('/target/dir', 'link_to_root', '/etc/shadow');
      }, /SYMLINK_ESCAPE_DETECTED/);
    });

    it('T20 missing shard rejected: package assembly fails if any shard is missing', () => {
      const shards = ['part1.tar.gz', 'part2.tar.gz'];
      const present = ['part1.tar.gz'];
      assert.throws(() => {
        verifySnapshotShards(shards, present);
      }, /MISSING_SNAPSHOT_SHARD/);
    });

    it('T21 bad shard hash rejected: package assembly fails if shard checksum does not match', () => {
      const manifest = { 'shard1': '1111111111111111111111111111111111111111111111111111111111111111' };
      const actual = { 'shard1': '2222222222222222222222222222222222222222222222222222222222222222' };
      assert.throws(() => {
        verifySnapshotShards(Object.keys(manifest), Object.keys(actual), manifest, actual);
      }, /SHARD_CHECKSUM_MISMATCH/);
    });

    it('T22 interrupted transfer resumable: checkpointing enables resumption of interrupted transfer', () => {
      const stateDir = mkdtempSync(join(tmpdir(), 'dr-state-t22-'));
      writeCheckpoint({
        stateDir,
        migrationId: 'mig-t22',
        phase: 'CP30_DR_SNAPSHOT',
        status: 'COMPLETED',
        details: { snapshotDone: true }
      });
      const cp = readCheckpoint(stateDir, 'mig-t22');
      assert.equal(cp?.phase, 'CP30_DR_SNAPSHOT');
      assert.equal(canResumeFromCheckpoint(cp, 'CP40_GITHUB_DESTINATION'), true);
      rmSync(stateDir, { recursive: true, force: true });
    });
  });

  // --- Group 4: Restore & Network Resilience (T23 - T27) ---
  describe('Restore & Network Resilience (T23 - T27)', () => {
    it('T23 remote restore reconstructs refs: restore reconstructs all branches, tags, and commits accurately', () => {
      const repoDir = createTempGitRepo();
      spawnSync('git', ['branch', 'feature/xyz'], { cwd: repoDir });
      spawnSync('git', ['tag', 'v2.0.0'], { cwd: repoDir });
      const outDir = mkdtempSync(join(tmpdir(), 'dr-out-t23-'));
      const backup = createGitBackup({ repoDir, outputDir: outDir, projectId: 'test-p23' });
      const restoreDir = mkdtempSync(join(tmpdir(), 'dr-restore-t23-'));
      const restoreRes = performRestoreTest({ bundlePath: backup.bundlePath, restoreDir });
      assert.equal(restoreRes.refsRestored, true);
      assert.equal(restoreRes.gitFsckPass, true);
      rmSync(repoDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
      rmSync(restoreDir, { recursive: true, force: true });
    });

    it('T24 restore reconstructs dirty state: restore test reconstructs staged and unstaged files', () => {
      const repoDir = createTempGitRepo();
      writeFileSync(join(repoDir, 'unstaged.txt'), 'unstaged');
      writeFileSync(join(repoDir, 'staged.txt'), 'staged');
      spawnSync('git', ['add', 'staged.txt'], { cwd: repoDir });
      const dirty = captureDirtyState(repoDir);
      const outDir = mkdtempSync(join(tmpdir(), 'dr-out-t24-'));
      const backup = createGitBackup({ repoDir, outputDir: outDir, projectId: 'test-p24' });
      const restoreDir = mkdtempSync(join(tmpdir(), 'dr-restore-t24-'));
      const restoreRes = performRestoreTest({
        bundlePath: backup.bundlePath,
        restoreDir,
        dirtyState: dirty
      });
      assert.equal(restoreRes.dirtyStateReconstructed, true);
      assert.ok(existsSync(join(restoreDir, 'unstaged.txt')));
      assert.ok(existsSync(join(restoreDir, 'staged.txt')));
      rmSync(repoDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
      rmSync(restoreDir, { recursive: true, force: true });
    });

    it('T25 no plaintext secret exposed: restore verifies zero plaintext secrets in backup', () => {
      const restoreDir = mkdtempSync(join(tmpdir(), 'dr-restore-t25-'));
      writeFileSync(join(restoreDir, 'file.ts'), 'export const a = 10;\n');
      const scanRes = scanProjectFiles(restoreDir);
      assert.equal(scanRes.hasPlaintextSecret, false);
      rmSync(restoreDir, { recursive: true, force: true });
    });

    it('T26 Taildrop over DERP accepted: Taildrop is supported even when direct connection is relayed over DERP', () => {
      const status = {
        peer: 'huy-node01',
        online: true,
        relay: 'sin',
        direct: false
      };
      const check = checkTailscaleTransport(status);
      assert.equal(check.usableForTaildrop, true);
    });

    it('T27 lack of direct path not treated as offline: DERP relay state is treated as active/valid', () => {
      const status = {
        peer: 'huy-node01',
        online: true,
        relay: 'sin',
        direct: false
      };
      const check = checkTailscaleTransport(status);
      assert.equal(check.isOffline, false);
      assert.equal(check.statusLabel, 'ACTIVE_DERP_RELAY');
    });
  });

  // --- Group 5: Node01 Promotion & Checkpoint Integrity (T28 - T32) ---
  describe('Node01 Promotion & Checkpoint Integrity (T28 - T32)', () => {
    it('T28 staging occurs before promotion: Node01 migration staging must complete before candidate promotion', () => {
      const baseDir = mkdtempSync(join(tmpdir(), 'node01-t28-'));
      const stagingDir = join(baseDir, 'staging');
      const candidateDir = join(baseDir, 'candidate');
      mkdirSync(stagingDir, { recursive: true });
      writeFileSync(join(stagingDir, 'data.txt'), 'test data');
      
      const pkg = createMigrationPackage({ sourceDir: stagingDir, outputDir: baseDir });
      assert.ok(existsSync(pkg.packagePath));
      assert.equal(verifyMigrationPackage(pkg.packagePath, pkg.sha256), true);

      const promoted = promoteCandidate({ packagePath: pkg.packagePath, candidateDir });
      assert.equal(promoted.success, true);
      assert.ok(existsSync(join(candidateDir, 'data.txt')));
      rmSync(baseDir, { recursive: true, force: true });
    });

    it('T29 failed validation blocks promote: bad checksum or missing files blocks atomic promote', () => {
      const baseDir = mkdtempSync(join(tmpdir(), 'node01-t29-'));
      const candidateDir = join(baseDir, 'candidate');
      const fakePackage = join(baseDir, 'corrupt.tar.gz');
      writeFileSync(fakePackage, 'corrupted');
      assert.throws(() => {
        promoteCandidate({ packagePath: fakePackage, candidateDir, expectedSha256: 'validhash123' });
      }, /PACKAGE_VERIFICATION_FAILED/);
      rmSync(baseDir, { recursive: true, force: true });
    });

    it('T30 rollback restores prior candidate state: rollback mechanism restores previous state cleanly', () => {
      const baseDir = mkdtempSync(join(tmpdir(), 'node01-t30-'));
      const candidateDir = join(baseDir, 'candidate');
      mkdirSync(candidateDir, { recursive: true });
      writeFileSync(join(candidateDir, 'v1.txt'), 'version 1');

      // Backup before promote
      const backupDir = join(baseDir, 'backup');
      mkdirSync(backupDir, { recursive: true });
      writeFileSync(join(backupDir, 'v1.txt'), 'version 1');

      // Mutate candidate to v2
      writeFileSync(join(candidateDir, 'v1.txt'), 'version 2 (broken)');

      // Rollback
      rollbackCandidate({ candidateDir, backupDir });
      assert.equal(readFileSync(join(candidateDir, 'v1.txt'), 'utf8'), 'version 1');
      rmSync(baseDir, { recursive: true, force: true });
    });

    it('T31 checkpoint resume works: resuming from valid checkpoint preserves completed phases', () => {
      const stateDir = mkdtempSync(join(tmpdir(), 'dr-state-t31-'));
      writeCheckpoint({
        stateDir,
        migrationId: 'mig-t31',
        phase: 'CP10_PROJECT_DISCOVERY',
        status: 'PASS',
        details: { projectsFound: 5 }
      });
      const cp = readCheckpoint(stateDir, 'mig-t31');
      assert.equal(cp?.status, 'PASS');
      assert.equal(cp?.details?.projectsFound, 5);
      rmSync(stateDir, { recursive: true, force: true });
    });

    it('T32 false PASS prevented: ensures missing receipts or incomplete steps never report PASS', () => {
      const incompleteReceipt = {
        GITHUB_DR: 'PASS',
        RESTORE_TEST: 'NOT_RUN', // missing/incomplete
        NODE01_MIGRATION_TOOLKIT: 'READY',
        SOURCE_DATA_DELETED: 'NO',
        SAFE_TO_START_NODE01_MIGRATION: 'YES'
      };
      assert.throws(() => {
        validateFinalReceipt(incompleteReceipt);
      }, /INCOMPLETE_RECEIPT_CANNOT_PASS/);
    });
  });

  // --- Group 6: Windows Discovery & Directive Root Guards (T33 - T36) ---
  describe('Windows Discovery & Directive Root Guards (T33 - T36)', () => {
    it('T33 broad C:\\Users\\Admin scan does not include unrelated personal data', () => {
      assert.equal(isExcludedUserProfileArea('C:\\Users\\Admin\\Pictures\\Vacation'), true);
      assert.equal(isExcludedUserProfileArea('C:\\Users\\Admin\\Videos'), true);
      assert.equal(isExcludedUserProfileArea('C:\\Users\\Admin\\Music'), true);
      assert.equal(isExcludedUserProfileArea('C:\\Users\\Admin\\NTUSER.DAT'), true);
    });

    it('T34 AppData excluded by default: discovery strictly excludes AppData by default', () => {
      assert.equal(isExcludedUserProfileArea('C:\\Users\\Admin\\AppData'), true);
      assert.equal(isExcludedUserProfileArea('C:\\Users\\Admin\\AppData\\Roaming\\Code'), true);
      assert.equal(isExcludedUserProfileArea('/mnt/c/Users/Admin/AppData'), true);
    });

    it('T35 .huy-ai owner private key excluded: discovery records presence metadata only, excludes key bytes', () => {
      const privKeyPath = 'C:\\Users\\Admin\\.huy-ai\\owner_gate_ed25519';
      const classification = scanAndClassifyFile(privKeyPath, 'DUMMY_KEY_MATERIAL');
      assert.equal(classification.category, FileClassification.PROHIBITED);
      assert.equal(classification.uploadAllowed, false);
      assert.equal(classification.presenceOnly, true);
    });

    it('T36 D:\\Data Website\\huy-ai-center used as control/artifact root, not authoritative source', () => {
      const rootPath = 'D:\\Data Website\\huy-ai-center';
      const isProject = isProjectDirectory(rootPath);
      // It is directive / control / artifact root, NOT normal source code repository
      assert.equal(isProject.isControlOrArtifactRoot, true);
      assert.equal(isProject.isAuthoritativeSource, false);
    });
  });
});
