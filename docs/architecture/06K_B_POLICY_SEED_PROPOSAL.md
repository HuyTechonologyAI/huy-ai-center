# PHASE 06K-B: POLICY SEED PROPOSAL
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-B-POLICY-001  
**Phase:** 06K-B (Multi-Org Migration Draft + Isolated Dry Run)  
**Status:** PROPOSED_06K_B (Awaiting 06K-C Canonical Review)  
**Date:** 2026-09-23  

---

## 1. Overview & Policy Governance Principle

In accordance with Phase 06K-B governance (Section 19), policy concepts are anchored to frozen architecture principles, but specific primary key identifiers and rule payloads not previously frozen are formally tagged as **`PROPOSED_06K_B`**.

These baseline policy proposals are safely tested during the 06K-B isolated dry-run and require explicit Human Owner sign-off before applying to production in Phase 06K-C.

---

## 2. Seeded Policy Manifest

### 2.1 Group Global Ceiling Policy
- **Policy ID:** `pol-group-global-ceiling`
- **Scope:** `GROUP`
- **Target ID:** `org-01-huytech`
- **Status:** `ACTIVE`
- **Priority:** `10`
- **Proposal Tag:** `PROPOSED_06K_B`
- **Rule Payload:**
```json
{
  "max_risk_level": 4,
  "require_human_gate_above_risk": 2,
  "disallowed_cross_org_egress": ["org-03-smarttax"]
}
```
- **Rationale:** Establishes the group-level invariant that risk levels 3 (Production Write) and 4 (Financial / Destructive) mandate human approval gates across all 6 business units.

---

### 2.2 SmartTax Hermetic Isolation Boundary Policy
- **Policy ID:** `pol-org-03-smarttax-isolation`
- **Scope:** `ORGANIZATION`
- **Target ID:** `org-03-smarttax`
- **Status:** `ACTIVE`
- **Priority:** `1` (Highest Evaluation Priority)
- **Proposal Tag:** `PROPOSED_06K_B`
- **Rule Payload:**
```json
{
  "zero_raw_egress": true,
  "sanitized_public_only": true,
  "disallowed_external_domains": ["*"]
}
```
- **Rationale:** Implements the "Tax Vault" zero-leak boundary. Blocks raw financial task execution or unapproved output egress outside SmartTax.

---

### 2.3 Media Agencies Outbound Policy
- **Policy ID:** `pol-group-media-outbound`
- **Scope:** `GROUP`
- **Target ID:** `org-01-huytech`
- **Status:** `ACTIVE`
- **Priority:** `50`
- **Proposal Tag:** `PROPOSED_06K_B`
- **Rule Payload:**
```json
{
  "allowed_publish_classifications": ["PUBLIC"],
  "require_brand_review": true
}
```
- **Rationale:** Constrains media business units (`org-04-media-tech`, `org-05-media-edu`, `org-06-media-creative`) to emitting only sanitized `PUBLIC` artifacts after brand verification.

---

## 3. Lifecycle & Promotion Gate

1. **Dry-Run Validation:** Exercised in `tests/security/multi-org-isolation.test.ts`.
2. **Review Milestone:** Human Owner reviews rule parameters during PR inspection.
3. **Phase 06K-C Promotion:** Promoted from `PROPOSED_06K_B` to canonical frozen state prior to production application.
