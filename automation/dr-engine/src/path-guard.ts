import { resolve, normalize } from 'node:path';

export function assertSafeStoragePath(targetPath: string): void {
  const norm = normalize(targetPath).replace(/\\/g, '/');
  if (norm === '/mnt/data2' || norm.startsWith('/mnt/data2/')) {
    throw new Error(`SECURITY_VIOLATION: R4_PROTECTED_DATA2 cannot be accessed, written, or targeted: ${targetPath}`);
  }
}

export function assertSafeNode01Target(targetPath: string): void {
  assertSafeStoragePath(targetPath);
  const norm = normalize(targetPath).replace(/\\/g, '/');
  // Check Windows drive mounts (/mnt/c, /mnt/d, C:\, etc.)
  if (/^(\/mnt\/[a-zA-Z]|[a-zA-Z]:)/.test(norm) && !norm.startsWith('/mnt/data1')) {
    throw new Error(`CONFIGURATION_ERROR: WINDOWS_TARGET_REJECTED_FOR_NODE01 canonical storage must be native Linux path on Node01: ${targetPath}`);
  }
  if (!norm.startsWith('/mnt/data1')) {
    throw new Error(`TARGET_INVALID: Node01 canonical path must be under /mnt/data1: ${targetPath}`);
  }
}

export function assertSafeExtractionPath(targetDir: string, subPath: string, linkTarget?: string): void {
  const normTarget = resolve(targetDir);
  const resolved = resolve(normTarget, subPath);

  if (!resolved.startsWith(normTarget) || subPath.includes('../') || subPath.includes('..\\')) {
    throw new Error(`SECURITY_VIOLATION: PATH_TRAVERSAL_DETECTED - path '${subPath}' escapes target directory '${normTarget}'`);
  }

  if (linkTarget) {
    const resolvedLink = resolve(normTarget, linkTarget);
    if (!resolvedLink.startsWith(normTarget)) {
      throw new Error(`SECURITY_VIOLATION: SYMLINK_ESCAPE_DETECTED - link target '${linkTarget}' resolves outside target directory '${normTarget}'`);
    }
  }
}

export function assertSafeRefPush(gitArgs: string[]): void {
  for (const arg of gitArgs) {
    if (arg === '--force' || arg === '-f' || arg === '--force-with-lease') {
      throw new Error(`SECURITY_VIOLATION: FORCE_PUSH_DENIED - destructive force push is strictly prohibited: ${gitArgs.join(' ')}`);
    }
  }
}

export function assertSourcePreserved(cmdArgs: string[]): void {
  const cmdStr = cmdArgs.join(' ');
  if (
    cmdStr.includes('rm -rf') ||
    cmdStr.includes('rm -r') ||
    cmdStr.includes('git clean -fdx') ||
    cmdStr.includes('Remove-Item')
  ) {
    // If it targets any source repo path
    if (
      cmdStr.includes('huy-ai-center') ||
      cmdStr.includes('/home/huyai007/workspace') ||
      cmdStr.includes('Users/Admin')
    ) {
      throw new Error(`SECURITY_VIOLATION: SOURCE_DELETION_DENIED - destructive source deletion is strictly prohibited: ${cmdStr}`);
    }
  }
}
