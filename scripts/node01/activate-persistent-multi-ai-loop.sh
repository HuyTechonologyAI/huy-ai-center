#!/usr/bin/env bash
set -euo pipefail

REPO="${HUY_AI_REPO:-/mnt/data1/Projects/HUY-AI-Center}"
STATE="${HUY_AI_SUPERVISOR_STATE_DIR:-/mnt/data1/HUY-AI/state/supervisors}"
UNIT_DIR="$HOME/.config/systemd/user"
UNIT="$UNIT_DIR/huy-ai-persistent-multi-ai.service"
SOURCE_UNIT="$REPO/deploy/node01/huy-ai-persistent-multi-ai.service"
BACKUP="$UNIT.pre-persistent-loop"

echo "=============================================================="
echo "HUY AI CENTER - PERSISTENT MULTI-AI LOOP ACTIVATION"
echo "=============================================================="
echo "MODE=AUTONOMOUS_FAIL_CLOSED"
echo "NODE01_DATA2_ACCESS=DENY"
echo "PRODUCTION_DATA_MIGRATION=DENY"
echo "SOURCE_DELETION=DENY"

test -d "$REPO/.git" || { echo "REPO_NOT_FOUND=$REPO"; exit 21; }
test -f "$SOURCE_UNIT" || { echo "UNIT_SOURCE_NOT_FOUND=$SOURCE_UNIT"; exit 22; }

case "$REPO" in
  /mnt/data2|/mnt/data2/*) echo "R4_DATA2_PATH_DENIED"; exit 23 ;;
esac

command -v node >/dev/null || { echo "NODE_UNAVAILABLE"; exit 24; }
command -v npm >/dev/null || { echo "NPM_UNAVAILABLE"; exit 25; }
command -v git >/dev/null || { echo "GIT_UNAVAILABLE"; exit 26; }

BRANCH="$(git -C "$REPO" branch --show-current)"
if [[ "$BRANCH" != feature/* && "$BRANCH" != agent-task/* ]]; then
  echo "COORDINATOR_BRANCH_UNSAFE=$BRANCH"
  exit 27
fi

if [ -n "$(git -C "$REPO" status --porcelain)" ]; then
  echo "REPO_DIRTY=DENY"
  exit 28
fi

mkdir -p "$STATE" "$UNIT_DIR"
chmod 700 "$STATE"

echo "PREACTIVATION_VERIFY=START"
npm --prefix "$REPO" ci
npm --prefix "$REPO" run build:shared
npm --prefix "$REPO" run typecheck
npm --prefix "$REPO" run test:bridge
echo "PREACTIVATION_VERIFY=PASS"

if [ -f "$UNIT" ]; then
  cp -p "$UNIT" "$BACKUP"
  echo "PREVIOUS_UNIT_BACKUP=PASS"
fi

cp "$SOURCE_UNIT" "$UNIT"
chmod 600 "$UNIT"

rollback() {
  rc=$?
  set +e
  systemctl --user disable --now huy-ai-persistent-multi-ai.service >/dev/null 2>&1 || true
  if [ -f "$BACKUP" ]; then
    cp -p "$BACKUP" "$UNIT"
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    systemctl --user enable --now huy-ai-persistent-multi-ai.service >/dev/null 2>&1 || true
  fi
  echo "ACTIVATION_ROLLBACK=EXECUTED"
  exit "$rc"
}
trap rollback ERR INT TERM

systemctl --user daemon-reload
systemctl --user enable --now huy-ai-persistent-multi-ai.service

echo "SERVICE_START=PASS"

for _ in $(seq 1 30); do
  if [ -s "$STATE/persistent-multi-ai-heartbeat.json" ]; then
    if node -e '
      const fs=require("fs");
      const p=process.argv[1];
      const x=JSON.parse(fs.readFileSync(p,"utf8"));
      const age=Date.now()-Date.parse(x.timestamp);
      if (!Number.isFinite(age) || age>90000) process.exit(2);
      if (!["RUNNING","IDLE","WAITING_PROVIDER","WAITING_HUMAN","DEGRADED"].includes(x.state)) process.exit(3);
    ' "$STATE/persistent-multi-ai-heartbeat.json"; then
      echo "SUPERVISOR_HEARTBEAT=PASS"
      systemctl --user is-active --quiet huy-ai-persistent-multi-ai.service
      echo "SERVICE_ACTIVE=PASS"
      rm -f "$BACKUP"
      trap - ERR INT TERM
      echo "PERSISTENT_MULTI_AI_LOOP=ACTIVE"
      echo "SAFE_TO_START_NODE01_MIGRATION=NO"
      exit 0
    fi
  fi
  sleep 3
done

echo "SUPERVISOR_HEARTBEAT=FAIL"
exit 29
