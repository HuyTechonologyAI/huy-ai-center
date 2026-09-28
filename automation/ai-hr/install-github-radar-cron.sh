#!/usr/bin/env bash
set -euo pipefail
umask 077
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
mode=${1:---preview}
[[ $# -le 1 && ( "$mode" == --preview || "$mode" == --install ) ]] || {
  echo 'Usage: install-github-radar-cron.sh [--preview|--install]' >&2
  exit 2
}
runner="$here/run-github-radar.sh"
[[ "$runner" =~ ^/[a-zA-Z0-9_./-]+$ ]] || {
  echo 'Unsafe cron runner path.' >&2
  exit 1
}
timezone=$(timedatectl show -p Timezone --value 2>/dev/null || true)
if [[ "$timezone" != "Asia/Ho_Chi_Minh" ]]; then
  echo "Node01 timezone must be Asia/Ho_Chi_Minh before installing GitHub Radar cron (got: ${timezone:-unknown})." >&2
  exit 1
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
if ! crontab -l > "$tmp/old" 2> "$tmp/error"; then
  if ! grep -qi 'no crontab for' "$tmp/error"; then
    echo 'Cannot read crontab; refusing to replace it.' >&2
    exit 1
  fi
  : > "$tmp/old"
fi

# Avoid ambiguous schedule semantics on cron implementations where CRON_TZ
# may persist for following entries. Node01 already uses Asia/Ho_Chi_Minh.
if grep -Eq '^[[:space:]]*CRON_TZ[[:space:]]*=' "$tmp/old"; then
  echo 'Existing CRON_TZ entries detected; refusing automatic modification.' >&2
  exit 1
fi

awk '
  /^# BEGIN HUY_AI_GITHUB_RADAR$/ { if (inside) exit 2; inside=1; next }
  /^# END HUY_AI_GITHUB_RADAR$/ { if (!inside) exit 2; inside=0; next }
  !inside { print }
  END { if (inside) exit 2 }
' "$tmp/old" > "$tmp/new"

{
  echo '# BEGIN HUY_AI_GITHUB_RADAR'
  printf '0 7 * * * /bin/bash %s # HUY_AI_GITHUB_RADAR_RUN morning\n' "$runner"
  printf '0 19 * * * /bin/bash %s # HUY_AI_GITHUB_RADAR_RUN evening\n' "$runner"
  echo '# END HUY_AI_GITHUB_RADAR'
} >> "$tmp/new"

if [[ "$mode" == --install ]]; then
  crontab "$tmp/new"
  echo 'Installed GitHub Radar at 07:00 and 19:00 Asia/Ho_Chi_Minh (system timezone).'
else
  cat "$tmp/new"
fi
