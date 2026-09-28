#!/usr/bin/env bash
set -euo pipefail
here=$(cd -- "$(dirname -- "$0")" && pwd)
tmp=$(mktemp -d "$here/.scripts-test-XXXXXX")
trap 'exec 8>&-; rm -rf "$tmp"' EXIT
mkdir "$tmp/bin"

cat > "$tmp/bin/crontab" <<'MOCK'
#!/usr/bin/env bash
if [[ ${1:-} == -l ]]; then
  if [[ -s "$TEST_CRONTAB" ]]; then cat "$TEST_CRONTAB"; else echo "no crontab for test" >&2; exit 1; fi
else
  cp "$1" "$TEST_CRONTAB"
fi
MOCK
cat > "$tmp/bin/timedatectl" <<'MOCK'
#!/usr/bin/env bash
echo Asia/Ho_Chi_Minh
MOCK
chmod +x "$tmp/bin/crontab" "$tmp/bin/timedatectl"
export TEST_CRONTAB="$tmp/crontab"
export PATH="$tmp/bin:$PATH"
printf '15 1 * * * echo existing\n' > "$TEST_CRONTAB"

bash "$here/install-github-radar-cron.sh" --install > /dev/null
cp "$TEST_CRONTAB" "$tmp/first"
bash "$here/install-github-radar-cron.sh" --install > /dev/null
cmp "$tmp/first" "$TEST_CRONTAB"
[[ $(grep -c '# HUY_AI_GITHUB_RADAR_RUN' "$TEST_CRONTAB") == 2 ]]
grep -q '^0 7 \* \* \* ' "$TEST_CRONTAB"
grep -q '^0 19 \* \* \* ' "$TEST_CRONTAB"
grep -q '^15 1 \* \* \* echo existing$' "$TEST_CRONTAB"
! grep -q '^CRON_TZ=' "$TEST_CRONTAB"
bash "$here/install-github-radar-cron.sh" > /dev/null
cmp "$tmp/first" "$TEST_CRONTAB"

# Existing CRON_TZ is an explicit fail-closed condition.
printf 'CRON_TZ=UTC\n15 1 * * * echo existing\n' > "$TEST_CRONTAB"
set +e
bash "$here/install-github-radar-cron.sh" --install >/dev/null 2>&1
tz_code=$?
set -e
[[ "$tz_code" != 0 ]]

# Overlap prevention.
: > "$TEST_CRONTAB"
export AI_HR_STATE_ROOT="$tmp/state"
mkdir -p "$AI_HR_STATE_ROOT/github-radar"
exec 8>"$AI_HR_STATE_ROOT/github-radar/run.lock"
flock -n 8
output=$(bash "$here/run-github-radar.sh")
[[ "$output" == *'"status":"skipped_locked"'* ]]
exec 8>&-

# Bounded timeout propagation.
cat > "$tmp/bin/node" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
cat > "$tmp/bin/timeout" <<'MOCK'
#!/usr/bin/env bash
[[ "$1 $2 $3" == '--signal=TERM --kill-after=15s 600s' ]] || exit 99
exit 124
MOCK
chmod +x "$tmp/bin/node" "$tmp/bin/timeout"
export AI_HR_NODE_BIN="$tmp/bin/node"
set +e
bash "$here/run-github-radar.sh" >/dev/null
code=$?
set -e
[[ "$code" == 124 ]]

echo 'PASS: cron idempotence, exact two schedules, timezone guard, lock, timeout'
