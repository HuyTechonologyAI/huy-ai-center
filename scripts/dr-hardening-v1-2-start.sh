#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/huyai007/workspace/huy-ai-center"
BRANCH="agent-task/dr-hardening-v1-2"
WT="$ROOT/.agent-worktrees/dr-hardening-v1-2"
AGY="/home/huyai007/.local/bin/agy"
DIRECTIVE="docs/automation/DR_HARDENING_V1_2_EXECUTION_DIRECTIVE.md"
ARTIFACT_DIR="$WT/.artifacts/dr-hardening-v1-2"

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
    git -C "$WT" merge --ff-only "origin/$BRANCH" || true
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
set +e
"$AGY" \
  -p "$PROMPT" \
  --add-dir "$WT" \
  --mode accept-edits \
  2>&1 | tee "$ARTIFACT_DIR/antigravity-v1_2.log"
rc=${PIPESTATUS[0]}
set -e

printf '%s\n' "finished_at=$(date -Is)" >> "$ARTIFACT_DIR/launcher-state.txt"
printf '%s\n' "agy_exit_code=$rc" >> "$ARTIFACT_DIR/launcher-state.txt"
printf '%s\n' "head_after=$(git -C "$WT" rev-parse HEAD)" >> "$ARTIFACT_DIR/launcher-state.txt"

if [ "$rc" -ne 0 ]; then
  echo "ANTIGRAVITY_EXECUTION=STOPPED"
  echo "AGY_EXIT_CODE=$rc"
  echo "WORKTREE_PRESERVED=$WT"
  echo "LOG=$ARTIFACT_DIR/antigravity-v1_2.log"
  exit "$rc"
fi

echo "ANTIGRAVITY_EXECUTION=COMPLETE"
echo "WORKTREE=$WT"
echo "LOG=$ARTIFACT_DIR/antigravity-v1_2.log"
echo "NEXT_AUTHORITY=DR_HARDENING_V1_2_FINAL_RECEIPT"
