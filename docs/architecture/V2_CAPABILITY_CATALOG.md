# HUY AI AGENCY GROUP V2.0 — CANONICAL CAPABILITY CATALOG

**DOCUMENT ID:** V2_CAPABILITY_CATALOG  
**SYSTEM:** HUY AI AGENCY GROUP V2.0  
**PHASE:** 06J-B (CAPABILITY TAXONOMY)  
**STATUS:** FROZEN CANONICAL CATALOG  

---

## 1. CANONICAL NAMING STANDARD

All capabilities in HUY AI AGENCY GROUP V2.0 follow a strict **dot-separated lowercase identifier format**:

```text
<domain>.<entity>.<action>  or  <domain>.<action>
```

- **Vendor-Agnostic Invariant:** Capabilities describe functional business intent, never upstream vendor or model brands.  
  - *Invalid:* `gemini.generate.slides`, `claude.check.tax`  
  - *Valid:* `education.lesson.design`, `tax.research`, `media.script.create`

---

## 2. CAPABILITY AUTHORITY RULE

> [!IMPORTANT]
> **A capability does NOT automatically grant operational authority.**  
> Authority in HUY AI AGENCY GROUP V2.0 is multi-dimensional. Declaring a capability like `tax.research` does NOT grant:
> 1. Tool execution permissions (governed by `allowed_tools` whitelist)
> 2. Data classification access (governed by `data_scopes`)
> 3. Vector namespace access (governed by `knowledge_scopes`)
> 4. Financial budget (governed by `cost_center` allocation)
> 5. Production mutation rights (governed by `risk_ceiling` and approval gates)
> 
> An agent operation is permitted **ONLY when ALL relevant policy dimensions evaluate to ALLOW**.

---

## 3. CANONICAL CAPABILITIES BY DOMAIN

### 3.1 Group Level Capabilities
- `group.plan` — Decompose group-level goals into cross-company DAGs.
- `group.delegate` — Dispatch tasks across subsidiaries via HAIP envelopes.
- `group.status.read` — Monitor task completion codes across all BUs.
- `group.cost.read` — Aggregate group spend rollups.
- `group.risk.read` — Inspect group risk profile and approval bottlenecks.

### 3.2 Company Level Capabilities
- `company.plan` — Formulate subsidiary project roadmaps and departmental goals.
- `company.delegate` — Dispatch tasks to department managers.
- `company.status.read` — Monitor subsidiary worker health and queue latency.
- `company.cost.read` — Audit subsidiary token burn rate against budget quotas.

### 3.3 Department Level Capabilities
- `department.plan` — Plan departmental task sequences.
- `department.assign` — Assign work to specialist agents within departmental scope.
- `department.review` — Conduct internal review of specialist outputs.

### 3.4 Engineering & Security Capabilities
- `engineering.codegen` — Synthesize code, API contracts, and database scripts.
- `engineering.code.review` — Review code quality, syntax, and test coverage.
- `security.audit` — Audit security posture, token storage, and RLS rules.
- `security.policy.review` — Evaluate policy requests against zero-trust standards.

### 3.5 Education Capabilities
- `education.lesson.design` — Formulate CV 5512 lesson plans and active learning pacing.
- `education.assessment.build` — Build Bloom-aligned questions and exam rubrics.
- `education.content.review` — Verify pedagogical clarity and curriculum adherence.

### 3.6 Tax & Legal Capabilities
- `tax.research` — Analyze CIT, VAT, and expense deduction guidelines.
- `tax.source.verify` — Cross-verify tax data against Official Gazette decrees.
- `legal.research` — Analyze commercial law and contractual precedents.
- `legal.citation.verify` — Deterministically verify that cited laws remain in force.

### 3.7 Media Capabilities
- `media.research` — Analyze viral trends, keyword volume, and audience demands.
- `media.script.create` — Write video scripts, outlines, and hooks.
- `media.asset.prepare` — Formulate prompts for slide, graphic, or audio generation.
- `media.brand.review` — Review brand guidelines, typography, and safety.
- `media.publish.request` — Enqueue approved media for distribution (requires human sign-off).
- `media.analytics.read` — Ingest viewer reach, engagement, and retention metrics.
