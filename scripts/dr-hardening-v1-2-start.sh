#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/huyai007/workspace/huy-ai-center"
BRANCH="agent-task/dr-hardening-v1-2"
WT="$ROOT/.agent-worktrees/dr-hardening-v1-2"
AGY="/home/huyai007/.local/bin/agy"
DIRECTIVE="docs/automation/DR_HARDENING_V1_2_EXECUTION_DIRECTIVE.md"
ARTIFACT_DIR="$WT/.artifacts/dr-hardening-v1-2"
LOG="$ARTIFACT_DIR/antigravity-v1_2.log"

echo "=============================================================="
echo "HUY AI CENTER — DR HARDENING V1.2 AUTONOMOUS START"
echo "=============================================================="
echo "BRANCH=$BRANCH"
echo "PRODUCTION_DATA_CUTOVER=DENY"
echo "SOURCE_DELETION=DENY"
echo "DATA2_ACCESS=DENY"

test -x "$AGY" || { echo "AGY_NOT_FOUND=$AGY"; exit 21; }
test -d "$ROOT/.git" || { echo "ROOT_REPO_NOT_FOUND=$ROOT"; exit 22; }

git -C "$ROOT" fetch origin "$BRANCH"

if [ ! -d "$WT" ]; then
  mkdir -p "$(dirname "$WT")"
  git -C "$ROOT" worktree add -B "$BRANCH" "$WT" "origin/$BRANCH"
else
  test -e "$WT/.git" || { echo "WORKTREE_PATH_EXISTS_BUT_IS_NOT_GIT_WORKTREE=$WT"; exit 23; }
  if [ -z "$(git -C "$WT" status --porcelain)" ]; then
    git -C "$WT" fetch origin "$BRANCH"
    git -C "$WT" reset --hard "origin/$BRANCH"
  else
    echo "EXISTING_WORKTREE_DIRTY=PRESERVED"
  fi
fi

test -f "$WT/$DIRECTIVE" || { echo "DIRECTIVE_NOT_FOUND=$WT/$DIRECTIVE"; exit 24; }

mkdir -p "$ARTIFACT_DIR"
printf '%s\n' "started_at=$(date -Is)" > "$ARTIFACT_DIR/launcher-state.txt"
printf '%s\n' "branch=$(git -C "$WT" branch --show-current)" >> "$ARTIFACT_DIR/launcher-state.txt"
printf '%s\n' "head=$(git -C "$WT" rev-parse HEAD)" >> "$ARTIFACT_DIR/launcher-state.txt"

PROMPT="$(cat "$WT/$DIRECTIVE")"

echo "ANTIGRAVITY_EXECUTION=START"
AGY_ARGS=( -p "$PROMPT" --add-dir "$WT" --mode accept-edits --sandbox --print-timeout 60m --output-format stream-json )
if [ -n "${AGY_PROJECT_ID:-}" ]; then
  AGY_ARGS+=( --project="$AGY_PROJECT_ID" )
  echo "ANTIGRAVITY_PROJECT_ID=$AGY_PROJECT_ID"
fi
set +e
"$AGY" "${AGY_ARGS[@]}" \
  2>&1 | tee "$LOG"
rc=${PIPESTATUS[0]}
set -e

# Antigravity headless can soft-deny a tool and still exit 0. Treat that as FAIL.
if grep -Eqi 'no output produced|auto-denied|required the "command" permission|permission that headless mode cannot prompt for' "$LOG"; then
  echo "ANTIGRAVITY_PERMISSION_SOFT_DENIAL=DETECTED"
  python3 - "$LOG" <<'PY' || true
import json, sys
p = sys.argv[1]
last = None
try:
    with open(p, "r", encoding="utf-8", errors="replace") as f:
        for raw in f:
            raw = raw.strip()
            if not raw.startswith("{"):
                continue
            try:
                obj = json.loads(raw)
            except Exception:
                continue
            su = obj.get("step_update") or {}
            if su.get("step_type") == "tool" and su.get("tool_name") == "run_command":
                info = su.get("tool_info") or {}
                params = info.get("parameters") or {}
                cmd = params.get("CommandLine") or params.get("command") or params.get("cmd")
                if cmd:
                    last = cmd
except Exception:
    pass
if last:
    print("LAST_STREAMED_RUN_COMMAND=" + str(last).replace("\n"," "))
else:
    print("LAST_STREAMED_RUN_COMMAND=UNAVAILABLE")
PY
  rc=86
fi

# A real custody gate is an expected stop condition, not a completed V1.2.
if grep -Fq 'HUMAN_GATE — DR RECOVERY KEY CUSTODY' "$LOG" || grep -Fq 'HUMAN_GATE - DR RECOVERY KEY CUSTODY' "$LOG"; then
  echo "DR_V1_2_HUMAN_GATE=DR_RECOVERY_KEY_CUSTODY"
  printf '%s\n' "finished_at=$(date -Is)" >> "$ARTIFACT_DIR/launcher-state.txt"
  printf '%s\n' "agy_exit_code=$rc" >> "$ARTIFACT_DIR/launcher-state.txt"
  printf '%s\n' "final_state=WAITING_HUMAN_KEY_CUSTODY" >> "$ARTIFACT_DIR/launcher-state.txt"
  echo "SAFE_TO_START_NODE01_MIGRATION=NO"
  exit 42
fi

printf '%s\n' "finished_at=$(date -Is)" >> "$ARTIFACT_DIR/launcher-state.txt"
printf '%s\n' "agy_exit_code=$rc" >> "$ARTIFACT_DIR/launcher-state.txt"
printf '%s\n' "head_after=$(git -C "$WT" rev-parse HEAD)" >> "$ARTIFACT_DIR/launcher-state.txt"

if [ "$rc" -ne 0 ]; then
  echo "ANTIGRAVITY_EXECUTION=STOPPED"
  echo "AGY_EXIT_CODE=$rc"
  echo "WORKTREE_PRESERVED=$WT"
  echo "LOG=$LOG"
  echo "SAFE_TO_START_NODE01_MIGRATION=NO"
  exit "$rc"
fi

# Never equate a zero CLI exit code with V1.2 PASS. Require an actual final receipt.
receipt="$(find "$WT" -type f -name 'DR_HARDENING_V1_2_FINAL_RECEIPT.json' -print -quit 2>/dev/null || true)"
if [ -z "$receipt" ]; then
  echo "ANTIGRAVITY_ZERO_EXIT_WITHOUT_FINAL_RECEIPT=FAIL"
  echo "WORKTREE_PRESERVED=$WT"
  echo "LOG=$LOG"
  echo "SAFE_TO_START_NODE01_MIGRATION=NO"
  exit 87
fi

echo "ANTIGRAVITY_EXECUTION=COMPLETE"
echo "WORKTREE=$WT"
echo "LOG=$LOG"
echo "FINAL_RECEIPT=$receipt"
echo "NEXT_AUTHORITY=DR_HARDENING_V1_2_FINAL_RECEIPT"
