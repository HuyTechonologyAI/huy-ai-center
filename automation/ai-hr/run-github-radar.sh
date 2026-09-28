#!/usr/bin/env bash
set -euo pipefail
umask 077
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
state_root=${AI_HR_STATE_ROOT:-/mnt/data1/HUY-AI/state/ai-hr}
export AI_HR_STATE_ROOT="$state_root"
mkdir -p -- "$state_root/github-radar"
exec 9>"$state_root/github-radar/run.lock"
if ! flock -n 9; then
  printf '%s\n' '{"status":"skipped_locked","candidates":[],"probation_pending":[],"human_gate_candidates":[]}'
  exit 0
fi
node_bin=${AI_HR_NODE_BIN:-node}
# Node 24 supplies native TypeScript stripping and fetch; no package installs.
"$node_bin" -e 'if (Number(process.versions.node.split(".")[0]) < 24) process.exit(1)' || {
  echo 'GitHub radar requires Node.js 24 or later.' >&2
  exit 1
}
# Keep the lock held by this shell until timeout and its child have terminated.
timeout --signal=TERM --kill-after=15s 600s "$node_bin" "$here/github-radar.ts"
