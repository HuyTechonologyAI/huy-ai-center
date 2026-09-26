import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export function syncFileToNode01(filePath: string, targetPeer: string = 'huy-node01'): { success: boolean; output: string } {
  if (!existsSync(filePath)) {
    return { success: false, output: `FILE_NOT_FOUND: ${filePath}` };
  }

  const res = spawnSync('tailscale', ['file', 'cp', filePath, `${targetPeer}:`], { encoding: 'utf8' });
  if (res.status === 0) {
    return { success: true, output: `SYNC_SUCCESS: Dispatched ${filePath} to ${targetPeer}` };
  } else {
    return { success: false, output: `SYNC_FAILED: ${res.stderr || res.stdout}` };
  }
}

export function isNode01Reachable(targetPeer: string = 'huy-node01'): boolean {
  const res = spawnSync('tailscale', ['status'], { encoding: 'utf8' });
  if (res.status !== 0) return false;
  return res.stdout.includes(targetPeer);
}
