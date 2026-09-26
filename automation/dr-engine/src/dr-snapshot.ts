import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

export function verifySnapshotShards(
  expectedShards: string[],
  presentShards: string[],
  expectedHashes?: Record<string, string>,
  actualHashes?: Record<string, string>
): void {
  for (const exp of expectedShards) {
    if (!presentShards.includes(exp)) {
      throw new Error(`VALIDATION_ERROR: MISSING_SNAPSHOT_SHARD - shard '${exp}' is missing from snapshot bundle`);
    }
  }

  if (expectedHashes && actualHashes) {
    for (const [shard, expectedHash] of Object.entries(expectedHashes)) {
      const actualHash = actualHashes[shard];
      if (!actualHash || actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
        throw new Error(`SECURITY_VIOLATION: SHARD_CHECKSUM_MISMATCH for '${shard}': expected ${expectedHash}, got ${actualHash}`);
      }
    }
  }
}

export function createEncryptedSnapshot(options: {
  filesOrDir: string[];
  outputDir: string;
  snapshotName: string;
  encryptionKey?: string;
}): {
  encryptedPath: string;
  sha256: string;
  manifestPath: string;
} {
  const { filesOrDir, outputDir, snapshotName, encryptionKey } = options;
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const key = encryptionKey || process.env.HUY_AI_DR_ENCRYPTION_KEY || 'HUY_AI_DR_DEFAULT_SECURE_KEY_2026';
  const tarPath = join(outputDir, `${snapshotName}.tar.gz`);
  const encryptedPath = join(outputDir, `${snapshotName}.tar.gz.enc`);

  // Create tar.gz using system tar
  const tarArgs = ['-czf', tarPath, ...filesOrDir];
  const tarRes = spawnSync('tar', tarArgs, { encoding: 'utf8' });
  if (tarRes.status !== 0 && !existsSync(tarPath)) {
    throw new Error(`TAR_CREATION_FAILED: ${tarRes.stderr}`);
  }

  // Encrypt with openssl enc -aes-256-cbc -pbkdf2
  const encRes = spawnSync(
    'openssl',
    ['enc', '-aes-256-cbc', '-salt', '-pbkdf2', '-in', tarPath, '-out', encryptedPath, '-k', key],
    { encoding: 'utf8' }
  );

  if (encRes.status !== 0) {
    throw new Error(`ENCRYPTION_FAILED: ${encRes.stderr}`);
  }

  // Remove plaintext tar
  spawnSync('rm', ['-f', tarPath]);

  // Compute SHA256 of encrypted file
  const encBytes = readFileSync(encryptedPath);
  const sha256 = createHash('sha256').update(encBytes).digest('hex');

  const manifest = {
    snapshotName,
    encryptedFile: `${snapshotName}.tar.gz.enc`,
    sha256,
    cipher: 'aes-256-cbc-pbkdf2',
    timestamp: new Date().toISOString()
  };

  const manifestPath = join(outputDir, `${snapshotName}-manifest.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return {
    encryptedPath,
    sha256,
    manifestPath
  };
}

export function decryptSnapshot(options: {
  encryptedPath: string;
  outputDir: string;
  encryptionKey?: string;
}): void {
  const { encryptedPath, outputDir, encryptionKey } = options;
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const key = encryptionKey || process.env.HUY_AI_DR_ENCRYPTION_KEY || 'HUY_AI_DR_DEFAULT_SECURE_KEY_2026';
  const tarPath = join(outputDir, 'decrypted-temp.tar.gz');

  const decRes = spawnSync(
    'openssl',
    ['enc', '-d', '-aes-256-cbc', '-pbkdf2', '-in', encryptedPath, '-out', tarPath, '-k', key],
    { encoding: 'utf8' }
  );

  if (decRes.status !== 0) {
    throw new Error(`DECRYPTION_FAILED: ${decRes.stderr}`);
  }

  const untarRes = spawnSync('tar', ['-xzf', tarPath, '-C', outputDir], { encoding: 'utf8' });
  spawnSync('rm', ['-f', tarPath]);

  if (untarRes.status !== 0) {
    throw new Error(`UNTAR_FAILED: ${untarRes.stderr}`);
  }
}
