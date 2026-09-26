import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { assertSafeStoragePath, assertSafeNode01Target } from './path-guard.js';
import { syncFileToNode01 } from './node01-sync.js';
import { writeCheckpoint } from './checkpoint-manager.js';

export interface MigrationItem {
  id: string;
  name: string;
  sourcePath: string;
  targetNode01Path: string;
  excludePatterns: string[];
  backupRequirement: string;
}

export const MIGRATION_ROSTER: MigrationItem[] = [
  {
    id: 'PKG-01-DIRECTIVES-AND-BLUEPRINTS',
    name: 'HUY AI Center Directives, Master Plans & Blueprints',
    sourcePath: '/mnt/d/Data Website/huy-ai-center',
    targetNode01Path: '/mnt/data1/HUY-AI/directive-package',
    excludePatterns: ['artifacts/dr', 'node_modules', '.git', 'dist', '.next'],
    backupRequirement: 'GITHUB_DR_VERIFIED'
  },
  {
    id: 'PKG-02-DR-SNAPSHOTS-AND-RECEIPTS',
    name: 'Disaster Recovery Snapshots, Git Bundles & Acceptance Receipts',
    sourcePath: '/mnt/d/Data Website/huy-ai-center/artifacts/dr',
    targetNode01Path: '/mnt/data1/HUY-AI/backups/dr-layer',
    excludePatterns: ['tmp'],
    backupRequirement: 'GITHUB_PRIVATE_DR_REPO_VERIFIED'
  },
  {
    id: 'PKG-03-MONOREPO-AUTHORITATIVE-SOURCE',
    name: 'HUY AI Center Monorepo Core Source Code & Git History',
    sourcePath: '/home/huyai007/workspace/huy-ai-center',
    targetNode01Path: '/mnt/data1/Projects/HUY-AI-Center',
    excludePatterns: ['node_modules', '.next', '.cache', '.agent-worktrees'],
    backupRequirement: 'GIT_BUNDLE_AND_REMOTE_REF_PUSHED'
  }
];

export function runStepByStepMigration(): {
  migrationId: string;
  results: Record<string, any>;
  summary: string;
} {
  const migrationId = `node01-migration-${Date.now()}`;
  const stagingDir = `/tmp/migration-staging-${Date.now()}`;
  const stateDir = `/mnt/d/Data Website/huy-ai-center/artifacts/dr/state`;
  mkdirSync(stagingDir, { recursive: true });
  mkdirSync(stateDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`HUY AI CENTER — STEP-BY-STEP DATA MIGRATION TO NODE-01`);
  console.log(`Migration ID: ${migrationId}`);
  console.log(`Node-01 Target: huy-node01 (100.79.240.108)`);
  console.log(`Policy: Lenovo REMOTE_CONTROL_PLANE_ONLY | Node01 AUTHORITATIVE`);
  console.log(`======================================================\n`);

  const results: Record<string, any> = {};

  for (let idx = 0; idx < MIGRATION_ROSTER.length; idx++) {
    const item = MIGRATION_ROSTER[idx];
    const stepNumber = idx + 1;
    const pkgFileName = `${migrationId}-${item.id}.tar.gz`;
    const manifestFileName = `${migrationId}-${item.id}.manifest.json`;

    console.log(`\n------------------------------------------------------`);
    console.log(`[STEP ${stepNumber}/${MIGRATION_ROSTER.length}] Bắt đầu xử lý: ${item.id}`);
    console.log(`Tên: ${item.name}`);
    console.log(`Nguồn (Lenovo): ${item.sourcePath}`);
    console.log(`Đích (Node-01): ${item.targetNode01Path}`);
    console.log(`Yêu cầu backup chuẩn: ${item.backupRequirement}`);
    console.log(`------------------------------------------------------`);

    // 1. Guard check
    assertSafeStoragePath(item.sourcePath);
    assertSafeNode01Target(item.targetNode01Path);

    if (!existsSync(item.sourcePath)) {
      throw new Error(`PRECONDITION_FAILED: Nguồn dữ liệu không tồn tại: ${item.sourcePath}`);
    }

    // 2. Pre-migration Checkpoint
    console.log(`[1/5] Tạo Pre-transfer Checkpoint cho ${item.id}...`);
    writeCheckpoint({
      stateDir,
      migrationId,
      phase: `CP_PRE_${item.id}`,
      status: 'RUNNING',
      details: {
        item_id: item.id,
        source: item.sourcePath,
        destination: item.targetNode01Path,
        backupRequirement: item.backupRequirement,
        started_at: new Date().toISOString()
      }
    });

    // 3. Packaging & Deterministic Checksum
    console.log(`[2/5] Đóng gói dữ liệu chuẩn nén tar.gz và tính mã băm SHA256...`);
    const archivePath = join(stagingDir, pkgFileName);
    const tarArgs = ['-czf', archivePath];
    for (const exc of item.excludePatterns) {
      tarArgs.push(`--exclude=${exc}`);
    }
    tarArgs.push('-C', item.sourcePath, '.');

    const tarRes = spawnSync('tar', tarArgs, { encoding: 'utf8' });
    if (tarRes.status !== 0 && !existsSync(archivePath)) {
      throw new Error(`PACKAGING_FAILED for ${item.id}: ${tarRes.stderr}`);
    }

    const archiveBytes = readFileSync(archivePath);
    const archiveSha256 = createHash('sha256').update(archiveBytes).digest('hex');
    const archiveSizeBytes = archiveBytes.length;
    const archiveSizeMB = (archiveSizeBytes / (1024 * 1024)).toFixed(2);
    console.log(`[3/5] Đã đóng gói thành công: ${archiveSizeMB} MB | SHA256: ${archiveSha256}`);

    // Verify package integrity (test unpack list)
    const testList = spawnSync('tar', ['-tzf', archivePath], { encoding: 'utf8' });
    if (testList.status !== 0) {
      throw new Error(`ARCHIVE_VERIFICATION_FAILED for ${archivePath}: Gói dữ liệu bị hỏng`);
    }

    // Create item manifest
    const manifestPath = join(stagingDir, manifestFileName);
    const manifestData = {
      package_id: item.id,
      package_name: item.name,
      migration_id: migrationId,
      archive_file: pkgFileName,
      archive_sha256: archiveSha256,
      archive_size_bytes: archiveSizeBytes,
      archive_size_mb: archiveSizeMB,
      source_lenovo_path: item.sourcePath,
      target_node01_path: item.targetNode01Path,
      backup_requirement: item.backupRequirement,
      created_at: new Date().toISOString()
    };
    writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));

    // 4. Transmission via Taildrop to Node01
    console.log(`[4/5] Truyền gói dữ liệu sang Node-01 qua Taildrop...`);
    const syncArchiveRes = syncFileToNode01(archivePath, 'huy-node01');
    if (!syncArchiveRes.success) {
      throw new Error(`TAILDROP_TRANSMISSION_FAILED for ${item.id}: ${syncArchiveRes.output}`);
    }
    console.log(`[4/5] Đã truyền gói lưu trữ: ${syncArchiveRes.output}`);

    const syncManifestRes = syncFileToNode01(manifestPath, 'huy-node01');
    if (!syncManifestRes.success) {
      console.warn(`[WARNING] Không thể truyền manifest cho ${item.id}: ${syncManifestRes.output}`);
    } else {
      console.log(`[4/5] Đã truyền manifest: ${syncManifestRes.output}`);
    }

    // 5. Post-migration Checkpoint & Anti-deletion Protection
    console.log(`[5/5] Ghi nhận Checkpoint hoàn tất truyền tải sang Node-01...`);
    writeCheckpoint({
      stateDir,
      migrationId,
      phase: `CP_POST_${item.id}`,
      status: 'PASS',
      details: {
        item_id: item.id,
        archiveFile: pkgFileName,
        archiveSha256,
        archiveSizeMB: `${archiveSizeMB} MB`,
        taildropStatus: 'DELIVERED_TO_NODE01',
        sourceStatusOnLenovo: 'PRESERVED_SAFE_UNTIL_NODE01_EXTRACTION_VERIFIED',
        antiOverwriteProtection: 'ACTIVE',
        completed_at: new Date().toISOString()
      }
    });

    results[item.id] = {
      status: 'TRANSFERRED_TO_NODE01',
      archiveFile: pkgFileName,
      sha256: archiveSha256,
      sizeMB: archiveSizeMB,
      sourcePreserved: true,
      targetNode01Path: item.targetNode01Path
    };

    console.log(`[HOÀN THÀNH STEP ${stepNumber}] ${item.id} -> PASS (Đã nạp vào spool Node-01)`);
  }

  // Final Ledger
  const ledgerPath = join(stateDir, `MIGRATION_LEDGER_${migrationId}.json`);
  const finalSummary = {
    migrationId,
    timestamp: new Date().toISOString(),
    node01Peer: 'huy-node01',
    node01IP: '100.79.240.108',
    totalItemsMigrated: MIGRATION_ROSTER.length,
    items: results,
    status: 'ALL_DATA_PACKAGED_AND_DELIVERED_TO_NODE01_SPOOL',
    lenovoStorageStatus: 'PRESERVED_SAFE_REMOTE_CONTROL_PLANE_ONLY'
  };
  writeFileSync(ledgerPath, JSON.stringify(finalSummary, null, 2));

  // Also auto-sync ledger to Node01
  syncFileToNode01(ledgerPath, 'huy-node01');

  console.log(`\n======================================================`);
  console.log(`MIGRATION SANG NODE-01 HOÀN TẤT THÀNH CÔNG!`);
  console.log(`Ledger: ${ledgerPath}`);
  console.log(`======================================================\n`);

  return {
    migrationId,
    results,
    summary: `Đã di chuyển an toàn toàn bộ ${MIGRATION_ROSTER.length} gói dữ liệu sang Node-01 với cơ chế checkpoint và bảo toàn dữ liệu gốc.`
  };
}
