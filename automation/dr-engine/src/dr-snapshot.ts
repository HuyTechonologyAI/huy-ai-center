import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

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

function requireAge(): void {
  const r = spawnSync('age', ['--version'], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error('AGE_NOT_AVAILABLE: install age before creating or restoring DR V1.2 snapshots');
  }
}

export function createEncryptedSnapshot(options: {
  filesOrDir: string[];
  outputDir: string;
  snapshotName: string;
  recipient?: string;
}): {
  encryptedPath: string;
  sha256: string;
  manifestPath: string;
} {
  const { filesOrDir, outputDir, snapshotName } = options;
  const recipient = options.recipient || process.env.HUY_AI_DR_AGE_RECIPIENT;
  if (!recipient) {
    throw new Error('MISSING_AGE_RECIPIENT: DR V1.2 fails closed without an age X25519 recipient');
  }

  requireAge();

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const tarPath = join(outputDir, `${snapshotName}.tar.gz`);
  const encryptedPath = join(outputDir, `${snapshotName}.tar.gz.age`);

  try {
    const tarRes = spawnSync('tar', ['-czf', tarPath, ...filesOrDir], { encoding: 'utf8' });
    if (tarRes.status !== 0 || !existsSync(tarPath)) {
      throw new Error(`TAR_CREATION_FAILED: ${tarRes.stderr || tarRes.stdout}`);
    }

    const encRes = spawnSync('age', ['-r', recipient, '-o', encryptedPath, tarPath], { encoding: 'utf8' });
    if (encRes.status !== 0 || !existsSync(encryptedPath)) {
      throw new Error(`ENCRYPTION_FAILED: ${encRes.stderr || encRes.stdout}`);
    }
  } finally {
    rmSync(tarPath, { force: true });
  }

  const encBytes = readFileSync(encryptedPath);
  const sha256 = createHash('sha256').update(encBytes).digest('hex');

  const manifest = {
    snapshotName,
    encryptedFile: `${snapshotName}.tar.gz.age`,
    sha256,
    cipher: 'age-x25519',
    recipientFingerprint: createHash('sha256').update(recipient).digest('hex'),
    timestamp: new Date().toISOString()
  };

  const manifestPath = join(outputDir, `${snapshotName}-manifest.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return { encryptedPath, sha256, manifestPath };
}

export function decryptSnapshot(options: {
  encryptedPath: string;
  outputDir: string;
  identityPath?: string;
}): void {
  const { encryptedPath, outputDir } = options;
  const identityPath = options.identityPath || process.env.HUY_AI_DR_AGE_IDENTITY_FILE;

  if (!identityPath) {
    throw new Error('MISSING_AGE_IDENTITY: DR restore fails closed without the owner recovery identity');
  }
  if (!existsSync(identityPath)) {
    throw new Error('MISSING_AGE_IDENTITY_FILE: configured recovery identity does not exist');
  }

  requireAge();
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const tarPath = join(outputDir, 'decrypted-temp.tar.gz');

  try {
    const decRes = spawnSync('age', ['-d', '-i', identityPath, '-o', tarPath, encryptedPath], { encoding: 'utf8' });
    if (decRes.status !== 0 || !existsSync(tarPath)) {
      throw new Error(`DECRYPTION_FAILED: ${decRes.stderr || decRes.stdout}`);
    }

    const untarRes = spawnSync('tar', ['-xzf', tarPath, '-C', outputDir], { encoding: 'utf8' });
    if (untarRes.status !== 0) {
      throw new Error(`UNTAR_FAILED: ${untarRes.stderr || untarRes.stdout}`);
    }
  } finally {
    rmSync(tarPath, { force: true });
  }
}
