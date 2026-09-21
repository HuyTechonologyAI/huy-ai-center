# HUY AI AGENCY GROUP V2.0 — CROSS-COMPANY DELEGATION MATRIX

**DOCUMENT ID:** V2_DELEGATION_MATRIX  
**SYSTEM:** HUY AI AGENCY GROUP V2.0  
**PHASE:** 06J-B (INTER-ORGANIZATIONAL GOVERNANCE)  
**STATUS:** FROZEN CANONICAL POLICY MATRIX  

---

## 1. CROSS-COMPANY DELEGATION GOVERNANCE

Cross-organization collaboration occurs exclusively via typed HAIP `DELEGATE` envelopes enqueued to the single durable `ai-jobs` queue in Supabase. Direct inter-tenant database queries or RPC calls are strictly blocked.

Every delegation request must declare 9 contract coordinates:
1. `source_organization_id`
2. `target_organization_id`
3. `source_agent_id`
4. `target_capability`
5. `artifact_refs` (with SHA-256 hashes)
6. `data_classification`
7. `risk_level`
8. `approval_status`
9. `cost_center`

---

## 2. CANONICAL DELEGATION MATRIX (ALLOW / DENY)

| Source Organization | Target Organization | Permitted Intent / Target Capability | Max Allowed Tier | Decision | Policy Condition & Enforcement |
|:---|:---|:---|:---:|:---:|:---|
| `org-01-huytech` (Parent) | Any Subsidiary (`*`) | `PLATFORM_TECHNICAL_ASSISTANCE` | `INTERNAL` | **ALLOW** | Technical framework deployment or infrastructure diagnosis |
| `org-02-aischool` | `org-05-media-edu` | `GENERATE_CAMPAIGN_MEDIA` | `PUBLIC` | **ALLOW** | Requires `PUBLIC_APPROVED` artifact and `pii_redacted = true` |
| `org-03-smarttax` | `org-04-media-tech` | `SYNDICATE_EDUCATIONAL_BRIEF` | `PUBLIC` | **ALLOW** | Requires `PUBLIC_APPROVED` artifact with citations verified by Legal QA |
| Any Media Agency (`04/05/06`) | `org-01-huytech` | `SUBMIT_ANALYTICS_ROLLUP` | `INTERNAL` | **ALLOW** | Aggregated audience metrics only; no viewer PII |
| `org-06-media-creative` | `org-04-media-tech` / `org-05-media-edu` | `SUPPLY_AUDIO_STEM` | `PUBLIC` | **ALLOW** | Royalty-free AI audio stem with licensing metadata |
| **Any Media Agency** | **`org-03-smarttax`** | Direct Query / Case Search | `CONFIDENTIAL` / `RESTRICTED` | **DENY** | **STRICTLY BLOCKED: Media agents cannot access SmartTax client data** |
| **Any Media Agency** | **`org-02-aischool`** | Student Records / Exam Bank | `CONFIDENTIAL` | **DENY** | **STRICTLY BLOCKED: Media agents cannot read confidential student PII** |
| **Any Unmapped Flow** | **Any Target** | Arbitrary Unregistered Intent | Any | **DENY** | **DEFAULT POLICY: DENY** |

---

## 3. SMARTTAX & AI SCHOOL SPECIAL PRIVACY PROTECTIONS

### 3.1 SmartTax Protection Invariant
- Media agents have **zero access** to raw taxpayer PII, client filings, or internal case files.
- The only permitted interaction is receiving an outbound `PUBLIC_APPROVED` tax brief emitted by `dept-03-legal-qa` for formatting into a public educational infographic or video.

### 3.2 AI School Student Privacy Invariant
- Student names, learning histories, and assessment scores are strictly tagged `CONFIDENTIAL`.
- Education Media (`org-05-media-edu`) can consume only teacher-approved public curriculum outlines (`PUBLIC`), never individual learner records.
