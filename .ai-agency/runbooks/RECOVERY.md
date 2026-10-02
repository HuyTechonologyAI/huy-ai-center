# RUNBOOK: RECOVERY
1. Detect failure from exit code != 0 or broken assertion.
2. Check if retry count < 3.
3. Fallback to alternative provider (e.g. Node01 Ollama local).
4. Restore clean git state via `git checkout -- .` or worktree cleanup.
5. Record incident checkpoint.
