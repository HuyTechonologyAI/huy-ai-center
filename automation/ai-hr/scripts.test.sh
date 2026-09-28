#!/usr/bin/env bash
set -euo pipefail
here=$(cd -- "$(dirname -- "$0")" && pwd)
tmp=$(mktemp -d "$here/.scripts-test-XXXXXX")
trap 'exec 8>&-; rm -rf "$tmp"' EXIT
mkdir "$tmp/bin"
cat > "$tmp/bin/crontab" <<'MOCK'
#!/usr/bin/env bash
if [[ ${1:-} == -l ]]; then cat "$TEST_CRONTAB"; else cp "$1" "$TEST_CRONTAB"; fi
MOCK
chmod +x "$tmp/bin/crontab"
export TEST_CRONTAB="$tmp/crontab"
export PATH="$tmp/bin:$PATH"
printf 'CRON_TZ=UTC\n15 1 * * * echo existing\n' > "$TEST_CRONTAB"
bash "$here/install-github-radar-cron.sh" --install > /dev/null
cp "$TEST_CRONTAB" "$tmp/first"
bash "$here/install-github-radar-cron.sh" --install > /dev/null
cmp "$tmp/first" "$TEST_CRONTAB"
[[ $(grep -c '# HUY_AI_GITHUB_RADAR_RUN' "$TEST_CRONTAB") == 2 ]]
grep -q '^0 7 \* \* \* ' "$TEST_CRONTAB"
grep -q '^0 19 \* \* \* ' "$TEST_CRONTAB"
grep -q '^CRON_TZ=Asia/Ho_Chi_Minh$' "$TEST_CRONTAB"
[[ $(tail -2 "$TEST_CRONTAB" | head -1) == 'CRON_TZ=UTC' ]]
bash "$here/install-github-radar-cron.sh" > /dev/null
cmp "$tmp/first" "$TEST_CRONTAB"
export AI_HR_STATE_ROOT="$tmp/state"
mkdir -p "$AI_HR_STATE_ROOT/github-radar"
exec 8>"$AI_HR_STATE_ROOT/github-radar/run.lock"
flock -n 8
output=$(bash "$here/run-github-radar.sh")
[[ "$output" == *'"status":"skipped_locked"'* ]]
echo 'PASS: installer idempotence, two entries, timezone restoration, preview and overlap lock'

exec 8>&-
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
set +e
bash "$here/run-github-radar.sh"
code=$?
set -e
[[ "$code" == 124 ]]
echo 'PASS: bounded timeout and failure exit propagation'
