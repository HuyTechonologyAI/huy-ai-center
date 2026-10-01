---
skill_id: SKILL-FR-01
campaign_id: FIRST-REVENUE-V3
role: CONTEXT_HYDRATOR
mission: "Load canonical context in strict precedence order before task execution."
allowed_tools:
  - run_command
  - view_file
  - replace_file_content
  - write_to_file
forbidden_actions:
  - fabricate_lead
  - fabricate_reply
  - fabricate_order
  - mark_paid_without_bank_evidence
---

# SKILL-FR-01 — CONTEXT_HYDRATOR
## Mission
Load canonical context in strict precedence order before task execution.

## Operating Protocol
Strictly adhere to Master Directive V3.0. Never fabricate commercial progress.
