import { spawnSync } from 'node:child_process';
import { assertSafeRefPush } from './path-guard.js';

export function validateDRRepoVisibility(repo: { name: string; isPrivate: boolean }): void {
  if (!repo.isPrivate) {
    throw new Error(`SECURITY_VIOLATION: PUBLIC_DR_REPO_REJECTED - DR repository '${repo.name}' MUST be private to prevent data exposure.`);
  }
}

export function verifyRemoteHashes(
  localHashes: Record<string, string>,
  remoteHashes: Record<string, string>
): void {
  for (const [file, localHash] of Object.entries(localHashes)) {
    const remoteHash = remoteHashes[file];
    if (!remoteHash || remoteHash.toLowerCase() !== localHash.toLowerCase()) {
      throw new Error(`SECURITY_VIOLATION: REMOTE_HASH_MISMATCH for '${file}': local=${localHash}, remote=${remoteHash || 'MISSING'}`);
    }
  }
}

export function ensurePrivateDRRepository(repoName: string): { created: boolean; isPrivate: boolean } {
  // Check if repo exists via gh
  const viewRes = spawnSync('gh', ['repo', 'view', repoName, '--json', 'name,isPrivate'], { encoding: 'utf8' });
  if (viewRes.status === 0) {
    try {
      const data = JSON.parse(viewRes.stdout);
      validateDRRepoVisibility(data);
      return { created: false, isPrivate: data.isPrivate };
    } catch (e: any) {
      if (e.message?.includes('PUBLIC_DR_REPO_REJECTED')) throw e;
    }
  }

  // If not found, create as private repository
  const createRes = spawnSync(
    'gh',
    ['repo', 'create', repoName, '--private', '--description', 'Disaster Recovery and Migration Snapshots for HUY AI Center'],
    { encoding: 'utf8' }
  );

  if (createRes.status !== 0) {
    throw new Error(`GH_REPO_CREATE_FAILED for ${repoName}: ${createRes.stderr}`);
  }

  return { created: true, isPrivate: true };
}

export function pushSafeBackupRef(options: {
  repoDir: string;
  backupRefName: string;
}): { success: boolean; ref: string } {
  const { repoDir, backupRefName } = options;
  const pushArgs = ['push', 'origin', `HEAD:refs/heads/${backupRefName}`];
  assertSafeRefPush(pushArgs);

  const res = spawnSync('git', pushArgs, { cwd: repoDir, encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`GIT_PUSH_BACKUP_REF_FAILED: ${res.stderr}`);
  }

  return { success: true, ref: backupRefName };
}
