#!/usr/bin/env bash
set -euo pipefail
umask 077

REPO="${HUY_AI_REPO:-/mnt/data1/HUY-AI/runtime/autonomy-control}"
STATE_DIR="${HUY_AI_TELEMETRY_STATE_DIR:-/mnt/data1/HUY-AI/state/telemetry}"
LOG_DIR="${HUY_AI_TELEMETRY_LOG_DIR:-/mnt/data1/HUY-AI/logs/autonomy-control}"
PID_FILE="$STATE_DIR/node01-telemetry-publisher.pid"
LOG_FILE="$LOG_DIR/node01-telemetry-publisher.log"
NODE_BIN="${HUY_AI_TELEMETRY_NODE_BIN:-/home/huyadmin/.nvm/versions/node/v24.21.0/bin/node}"
TSX_CLI="${HUY_AI_TELEMETRY_TSX_CLI:-$REPO/node_modules/tsx/dist/cli.mjs}"
SCRIPT="$REPO/automation/agent-bridge/src/node01-telemetry-publisher.ts"

mkdir -p "$STATE_DIR" "$LOG_DIR"

if [[ -f "$PID_FILE" ]]; then
  pid=$(cat "$PID_FILE" 2>/dev/null || true)
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
    cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
    if [[ "$cmdline" == *"node01-telemetry-publisher.ts"* ]]; then
      exit 0
    fi
  fi
  mv "$PID_FILE" "$PID_FILE.stale-$(date -u +%Y%m%dT%H%M%SZ)" 2>/dev/null || rm -f "$PID_FILE"
fi

[[ -x "$NODE_BIN" ]] || { echo "NODE_BIN_UNAVAILABLE" >&2; exit 21; }
[[ -f "$TSX_CLI" && -f "$SCRIPT" ]] || { echo "TELEMETRY_RUNTIME_UNAVAILABLE" >&2; exit 22; }

cd "$REPO"
nohup setsid "$NODE_BIN" "$TSX_CLI" "$SCRIPT" >>"$LOG_FILE" 2>&1 < /dev/null &
pid=$!
printf '%s\n' "$pid" > "$PID_FILE"
sleep 1
kill -0 "$pid" 2>/dev/null || { echo "TELEMETRY_START_FAILED" >&2; exit 23; }
echo "TELEMETRY_PUBLISHER_RUNNING=$pid"
