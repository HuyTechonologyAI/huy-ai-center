# Initial evidence-based staffing plan

As of 2026-09-27, evidence is limited to repository role definitions and roadmap intent.
Sources: `config/organization/ai-hr-agent.json`, `config/organization/workforce-roles.json`,
`config/autonomy/system-roadmap.json`; policy checks: `tests/automation/test_ai_hr_boundaries.py`.
No individual capability receipts or provider performance measurements were verified.
All 12 roles remain UNVERIFIED with zero permissions; headcount means proposed coverage.

| Order | Roles / proposed capability | Verification benchmark |
| --- | --- | --- |
| 0 | ai-hr-001: staffing and governance | Complete evidence matrix; reject unauthorized allocation |
| 1 | chief-architect: planning; primary-coder: implementation | Scoped dependency plan; isolated change passes required checks |
| 1 | qa: regression testing; security: boundary review | Detect seeded regression; reject traversal and privilege escalation |
| 1 | devops: recovery planning | Sandbox restore drill with no production access |
| 2 | data: schema design; research: source verification | Offline schema review; reproducible source-backed report |
| 2 | education: learning design; tax-legal: knowledge review | Rubric-reviewed lesson; source and jurisdiction review |
| 3 | content: publishing drafts; ops: triage | Brand-reviewed draft; synthetic escalation exercise |

Antigravity is the roadmap's proposed primary implementer/planner; Codex is secondary
implementer/reviewer. Neither designation proves competence or grants permissions.
Recruit the core team after `ai-workforce-plan`; domain roles wait for demonstrated demand.
Before allocation require three isolated probation tasks, 100% required checks passing,
zero unresolved security findings, and an independent reviewer different from the candidate.
Receipts use the policy's closed string schema: role_id, capability, evidence (repository
path plus revision and check result), verified_at/expires_at (UTC timestamps), reviewer.
Role and capability must match the task; evidence expires within 30 days and on relevant change.
Start at one concurrent task, matching the roadmap; approve no paid provider or extra capacity.
Any failure, expired receipt or revocation reduces allocation to zero pending re-verification.
Policy contract tests check declared gates, not runtime path rejection or dispatch integration.
Next benchmark: enforce these gates in a separately authorized runtime task and test adversarial
paths, symlink escapes, stale receipts, approval replay and revocation before onboarding.
