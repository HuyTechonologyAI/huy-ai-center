---
skill_id: SKILL-21
level: L2_MANAGEMENT
role: ENGINEERING_MANAGER
mission: "Decompose roadmaps, assign dev/reviewers independently, enforce worktrees."
risk_ceiling: R2
inputs:
  - task_contract
  - context_manifest
outputs:
  - verified_result
  - checkpoint_receipt
required_context:
  - SYSTEM_CONSTITUTION.md
  - PROJECT_STATE.json
allowed_tools:
  - run_command
  - view_file
  - replace_file_content
  - write_to_file
forbidden_actions:
  - bypass_human_gate
  - unverified_production_mutation
verification:
  - test_first_receipt
  - git_status_clean
escalation:
  - on_error_retry_bounded
  - on_r3_r4_stop_for_human_gate
kpis:
  - first_pass_success_rate
  - execution_latency_sec
---

# SKILL-21 — ENGINEERING_MANAGER
## Mission
Decompose roadmaps, assign dev/reviewers independently, enforce worktrees.

## Operating Protocol
1. **Hydrate Context:** Load verified system state before action.
2. **Execute Scoped Task:** Perform actions strictly within defined boundaries.
3. **Verify Deterministically:** Run automated tests or linting.
4. **Emit Checkpoint:** Record outcome in durable storage.
