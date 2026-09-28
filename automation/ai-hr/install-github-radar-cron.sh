#!/usr/bin/env bash
set -euo pipefail
umask 077
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
mode=${1:---preview}
[[ $# -le 1 && ( "$mode" == --preview || "$mode" == --install ) ]] || {
  echo 'Usage: install-github-radar-cron.sh [--preview|--install]' >&2; exit 2;
}
# CRON_TZ must be supported by the host cron daemon (for example Cronie).
# Reject characters that could alter cron/shell parsing, including cron's special %.
runner="$here/run-github-radar.sh"
[[ "$runner" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo 'Unsafe cron runner path.' >&2; exit 1; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
if ! crontab -l > "$tmp/old" 2> "$tmp/error"; then
  if ! grep -qi 'no crontab for' "$tmp/error"; then
    echo 'Cannot read crontab; refusing to replace it.' >&2; exit 1
  fi
  : > "$tmp/old"
fi
# Remove only this installer's managed block; reject malformed block markers.
awk '
 /^# BEGIN HUY_AI_GITHUB_RADAR$/ {if (inside) exit 2; inside=1; next}
 /^# END HUY_AI_GITHUB_RADAR$/ {if (!inside) exit 2; inside=0; next}
 !inside {print}
 END {if (inside) exit 2}
' "$tmp/old" > "$tmp/new"
# Preserve the timezone that applied at the end of the original crontab.
previous_tz=$(awk '/^[[:space:]]*CRON_TZ[[:space:]]*=/ {line=$0} END {print line}' "$tmp/new")
{
  echo '# BEGIN HUY_AI_GITHUB_RADAR'
  echo 'CRON_TZ=Asia/Ho_Chi_Minh'
  printf '0 7 * * * /bin/bash %s # HUY_AI_GITHUB_RADAR_RUN morning\n' "$runner"
  printf '0 19 * * * /bin/bash %s # HUY_AI_GITHUB_RADAR_RUN evening\n' "$runner"
  printf '%s\n' "${previous_tz:-CRON_TZ=}" 
  echo '# END HUY_AI_GITHUB_RADAR'
} >> "$tmp/new"
if [[ "$mode" == --install ]]; then
  crontab "$tmp/new"
  echo 'Installed two GitHub Radar entries (07:00 and 19:00 Asia/Ho_Chi_Minh).'
else
  cat "$tmp/new"
fi
