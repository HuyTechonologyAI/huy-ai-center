#!/usr/bin/env bash
set -euo pipefail
repo=/mnt/data1/HUY-AI/runtime/autonomy-control
unit_src="$repo/deploy/node01/huy-ai-dispatcher-v2.service"
unit_dst="$HOME/.config/systemd/user/huy-ai-dispatcher-v2.service"
receipt=/mnt/data1/HUY-AI/state/human-gates/07b-dell-deploy.receipt
node=/home/huyadmin/.nvm/versions/node/v24.21.0/bin/node
npm=/home/huyadmin/.nvm/versions/node/v24.21.0/bin/npm

export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"

cd "$repo"
"$npm" run build --workspace=@huy-ai/contracts
"$npm" run build --workspace=@huy-ai/dispatcher
"$node" --test deploy/node01/dispatcher-v2-deploy.test.mjs

install -d -m 0700 "$HOME/.config/systemd/user"
install -m 0644 "$unit_src" "$unit_dst"
systemctl --user daemon-reload
systemctl --user enable --now huy-ai-dispatcher-v2.service
sleep 2

python3 - <<'PY'
import json, urllib.request
for path in ('health','ready','selftest'):
    with urllib.request.urlopen(f'http://127.0.0.1:18081/{path}', timeout=5) as r:
        body=json.load(r)
        if r.status != 200:
            raise SystemExit(f'{path}:HTTP_{r.status}')
        if path == 'health' and not body.get('dispatcherV2Loaded'):
            raise SystemExit('health:core_not_loaded')
        if path == 'selftest' and body.get('coreDecision',{}).get('reason') != 'NO_ELIGIBLE_AGENT':
            raise SystemExit('selftest:unexpected_decision')
PY

ss -ltn | grep -qE '127\.0\.0\.1:18081[[:space:]]'
if ss -ltn | grep -qE '(0\.0\.0\.0:18081|\[::\]:18081)'; then
  echo "DISPATCHER_V2_BIND_EXPOSED" >&2
  exit 6
fi

mkdir -p "$(dirname "$receipt")"
sha=$(git rev-parse HEAD)
cat > "$receipt" <<EOF
TASK=07b-dell-deploy
STATUS=DEPLOYED_QUEUE_GATED
APPLIED_AT=$(date -Is)
SOURCE_SHA=$sha
SERVICE=huy-ai-dispatcher-v2.service:ACTIVE
HEALTH=http://127.0.0.1:18081/health
SELFTEST=NO_ELIGIBLE_AGENT_EXPECTED
QUEUE_GATE=CLOSED_07C
SUPABASE_SERVICE_ROLE_KEY=NOT_REQUIRED
ROLLBACK=$repo/deploy/node01/rollback-dispatcher-v2.sh
EOF
chmod 0600 "$receipt"
echo "07b-dell-deploy PASS_QUEUE_GATED"
