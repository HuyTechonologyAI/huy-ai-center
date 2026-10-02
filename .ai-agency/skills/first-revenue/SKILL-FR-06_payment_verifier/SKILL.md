---
skill_id: SKILL-FR-06
campaign_id: FIRST-REVENUE-V3
role: PAYMENT_VERIFIER
mission: "Validate SePay webhook, signature, timestamp, duplicate, order match, amount match deterministically."
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

# SKILL-FR-06 — PAYMENT_VERIFIER
## Mission
Validate SePay webhook, signature, timestamp, duplicate, order match, amount match deterministically.

## Operating Protocol
Strictly adhere to Master Directive V3.0. Never fabricate commercial progress.
