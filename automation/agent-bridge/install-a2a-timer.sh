#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
if [[ "$(git branch --show-current)" != "feature/ai-dev-bridge-b-autonomous-backlog" ]]; then
  echo 'Run the installer from the feature coordination worktree.' >&2
  exit 1
fi
for binary in node npm codex agy systemctl; do
  command -v "$binary" >/dev/null || { echo "Missing tool: $binary" >&2; exit 1; }
done
systemctl --user show-environment >/dev/null || { echo 'systemd user manager unavailable in this WSL session.' >&2; exit 1; }

unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
mkdir -p "$unit_dir"
service_path="$unit_dir/huy-ai-bridge-a2a.service"
timer_path="$unit_dir/huy-ai-bridge-a2a.timer"

cat > "$service_path" <<EOF
[Unit]
Description=HUY AI Center guarded A2A roadmap runner

[Service]
Type=oneshot
WorkingDirectory=$repo_root
Environment="PATH=$PATH"
ExecStart=$(command -v node) $repo_root/automation/agent-bridge/a2a-runner.mjs --execute
TimeoutStartSec=7200
EOF

cat > "$timer_path" <<'EOF'
[Unit]
Description=Check HUY AI Center roadmap every 15 minutes

[Timer]
OnBootSec=3min
OnUnitInactiveSec=15min
Unit=huy-ai-bridge-a2a.service

[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now huy-ai-bridge-a2a.timer
echo 'A2A timer installed. Inspect: systemctl --user status huy-ai-bridge-a2a.timer'
echo 'Logs: journalctl --user -u huy-ai-bridge-a2a.service -n 60 --no-pager'
