import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function probeCli(command: string, args: string[] = ['--version']): { installed: boolean; version?: string } {
  // Windows npm is a .cmd shim. Invoke its JS entry point directly when available.
  const npmEntry = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const useNpmEntry = process.platform === 'win32' && command === 'npm' && existsSync(npmEntry);
  const result = spawnSync(useNpmEntry ? process.execPath : command, useNpmEntry ? [npmEntry, ...args] : args, {
    encoding: 'utf8', timeout: 5000, shell: false,
  });
  if (result.error || result.status !== 0) return { installed: false };
  return { installed: true, version: (result.stdout || result.stderr || '').trim().split('\n')[0] };
}
