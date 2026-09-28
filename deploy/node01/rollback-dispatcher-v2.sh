#!/usr/bin/env bash
set -euo pipefail
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
unit="$HOME/.config/systemd/user/huy-ai-dispatcher-v2.service"
systemctl --user disable --now huy-ai-dispatcher-v2.service 2>/dev/null || true
if [ -f "$unit" ]; then
  rm -f "$unit"
fi
systemctl --user daemon-reload
echo "07b-dell-deploy ROLLED_BACK"
