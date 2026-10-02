---
skill_id: REV-SKILL-15
level: REVENUE_ENGINE
role: CUSTOMER_SUCCESS_HANDOFF
mission: "Deliver instantaneous onboarding, tutorials, and license confirmation upon paid order."
risk_ceiling: R1
inputs:
  - task_contract
  - revenue_context
outputs:
  - verified_commercial_evidence
  - crm_state_transition
required_context:
  - context/revenue/REVENUE_MISSION.md
  - context/revenue/REVENUE_EVIDENCE_POLICY.md
allowed_tools:
  - run_command
  - view_file
  - replace_file_content
  - write_to_file
forbidden_actions:
  - fabricate_leads
  - fabricate_replies
  - mark_paid_without_bank_evidence
verification:
  - external_evidence_receipt
  - anti_hallucination_check
kpis:
  - verified_lead_accuracy
  - time_to_first_paid_order
---

# REV-SKILL-15 — CUSTOMER_SUCCESS_HANDOFF
## Mission
Deliver instantaneous onboarding, tutorials, and license confirmation upon paid order.

## Operating Principles
1. **Evidence-First:** Never fabricate prospects, leads, replies, or payments.
2. **Deterministic Validation:** Real source URL, contact path, and bank reference required.
3. **Continuous Alignment:** Prioritize actions that bring the system closer to the first verified payment.
