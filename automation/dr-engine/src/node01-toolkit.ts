import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { assertSafeNode01Target, assertSafeExtractionPath } from './path-guard.js';

export function checkTailscaleTransport(status: {
  peer: string;
  online: boolean;
  relay?: string;
  direct?: boolean;
}): {
  usableForTaildrop: boolean;
  isOffline: boolean;
  statusLabel: string;
} {
  if (!status.online) {
    return {
      usableForTaildrop: false,
      isOffline: true,
      statusLabel: 'OFFLINE'
    };
  }

  const isRelayed = Boolean(status.relay && !status.direct);
  return {
    usableForTaildrop: true, // Taildrop works across DERP relay as confirmed in directive
    isOffline: false,
    statusLabel: isRelayed ? 'ACTIVE_DERP_RELAY' : 'DIRECT_PEER'
  };
}

export function createMigrationPackage(options: {
  sourceDir: string;
  outputDir: string;
  packageName?: string;
}): { packagePath: string; sha256: string } {
  const { sourceDir, outputDir, packageName = 'node01-migration-payload' } = options;
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const packagePath = join(outputDir, `${packageName}.tar.gz`);
  const tarRes = spawnSync('tar', ['-czf', packagePath, '-C', sourceDir, '.'], { encoding: 'utf8' });
  if (tarRes.status !== 0 && !existsSync(packagePath)) {
    throw new Error(`TAR_CREATE_FAILED: ${tarRes.stderr}`);
  }

  const bytes = readFileSync(packagePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');

  return { packagePath, sha256 };
}

export function verifyMigrationPackage(packagePath: string, expectedSha256: string): boolean {
  if (!existsSync(packagePath)) return false;
  const bytes = readFileSync(packagePath);
  const hash = createHash('sha256').update(bytes).digest('hex');
  return hash.toLowerCase() === expectedSha256.toLowerCase();
}

export function promoteCandidate(options: {
  packagePath: string;
  candidateDir: string;
  expectedSha256?: string;
}): { success: boolean; candidateDir: string } {
  const { packagePath, candidateDir, expectedSha256 } = options;

  if (expectedSha256) {
    if (!verifyMigrationPackage(packagePath, expectedSha256)) {
      throw new Error(`VALIDATION_ERROR: PACKAGE_VERIFICATION_FAILED - checksum mismatch for migration candidate`);
    }
  }

  if (!existsSync(packagePath)) {
    throw new Error(`VALIDATION_ERROR: PACKAGE_VERIFICATION_FAILED - package file does not exist: ${packagePath}`);
  }

  if (!existsSync(candidateDir)) {
    mkdirSync(candidateDir, { recursive: true });
  }

  const untarRes = spawnSync('tar', ['-xzf', packagePath, '-C', candidateDir], { encoding: 'utf8' });
  if (untarRes.status !== 0) {
    throw new Error(`PACKAGE_EXTRACTION_FAILED: ${untarRes.stderr}`);
  }

  return { success: true, candidateDir };
}

export function rollbackCandidate(options: {
  candidateDir: string;
  backupDir: string;
}): { success: boolean } {
  const { candidateDir, backupDir } = options;
  if (!existsSync(backupDir)) {
    throw new Error(`ROLLBACK_FAILED: Backup directory does not exist: ${backupDir}`);
  }

  // Clear current candidate and restore from backup
  rmSync(candidateDir, { recursive: true, force: true });
  mkdirSync(candidateDir, { recursive: true });
  cpSync(backupDir, candidateDir, { recursive: true });

  return { success: true };
}
