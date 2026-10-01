import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd());
const AGENCY_DIR = join(ROOT, '.ai-agency');

console.log('[REV3-SETUP] Materializing Campaign V3 Structure...');

// 1. Create Directories
const DIRS = [
  'campaigns/first-revenue',
  'skills/first-revenue',
  'workstreams/first-revenue',
  'workstreams/first-revenue/TASKS',
  'workstreams/first-revenue/CHECKPOINTS',
  'workstreams/first-revenue/EVIDENCE'
];

for (const d of DIRS) {
  const p = join(AGENCY_DIR, d);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

// 2. CAMPAIGN CONTEXT FILES (Section 36)
const CAMPAIGN_FILES: Record<string, string> = {
  'CAMPAIGN.md': `# CAMPAIGN — FIRST VERIFIED PAID ORDER V3.0
**Campaign ID:** FIRST-REVENUE-V3
**Mode:** PRODUCTION EXECUTION
**Human Owner:** Ngô Quốc Huy
**L1 Supervisor:** ANTIGRAVITY
**Primary Objective:** FIRST_VERIFIED_PAID_ORDER
**Condition:** Real Customer + Real Need + Customer Acceptance + Live Payment (SePay) + Evidence = PAID_ORDER.
`,
  'OFFER.md': `# OFFER SPECIFICATION — HUY-AUTO-PILOT-4900
**Entry Offer:** Đánh giá cơ hội tự động hóa 15 phút (0 VNĐ).
**Paid Offer:** AI Automation Pilot
**Price:** 4,900,000 VNĐ

### Scope:
- Processes: 1
- Departments: 1
- External connectors max: 2
- Workflows: 1
- Before/After report: true
- Handover documentation: true
- Target delivery: 7 days after access

### Exclusions:
- ERP replacement, large custom software, hardware, 3rd party SaaS fees, ad spend, unlimited revisions.
- All pricing/discount changes require R3/R4 Human Gate.
`,
  'ICP.md': `# IDEAL CUSTOMER PROFILE (ICP)
**Primary ICP:** SME Cơ khí / Sản xuất tại Việt Nam
**Expansion:** FORBIDDEN_UNTIL_FIRST_ORDER
**Typical Pains:**
- Quản lý đơn hàng, báo giá và tiến độ sản xuất thủ công qua Excel/Zalo.
- Thất lạc thông tin trao đổi kỹ thuật và bản vẽ.
- Tốn nhiều thời gian tổng hợp báo cáo xưởng định kỳ.
`,
  'CHANNEL_POLICY.md': `# CHANNEL POLICY
**Primary Acquisition Channel:** GOOGLE_SEARCH (Search Intent ➔ Landing /automation-pilot ➔ Form Opt-in).
**Secondary Channels:** DISABLED UNTIL FIRST ORDER.
**Strictly Forbidden:** Cold mass email, scraping Google Maps/Zalo, Facebook automated spam.
`,
  'PAYMENT_POLICY.md': `# PAYMENT POLICY
**Provider:** SEPAY (Exclusive for Sprint 1).
**Verification Pipeline:** SePay Webhook ➔ Signature Auth ➔ Deduplicate ➔ Match Order ➔ Match Amount (4,900,000 VND) ➔ Supabase Event ➔ PAID_VERIFIED.
**Test/Sandbox Policy:** Counts as TEST_ONLY, strictly excluded from revenue metrics.
`,
  'EVIDENCE_POLICY.md': `# EVIDENCE POLICY
- No Evidence ➔ No State Transition.
- No Source ➔ No Lead.
- No Real Customer Acceptance ➔ No Won Opportunity.
- No Live SePay Bank Reference ➔ No PAID status.
`,
  'HUMAN_GATES.md': `# HUMAN GATES (R3 / R4)
- GATE-ADS-001 (R4): Kích hoạt ngân sách Google Search Ads.
- GATE-SEPAY-001 (R4): Ủy quyền tài khoản thanh toán SePay live.
- GATE-PROPOSAL-001 (R3): Phê duyệt báo giá thương mại cuối cùng trước khi gửi khách.
- GATE-OFFER-CHANGE (R3/R4): Thay đổi cấu trúc gói hoặc giá bán.
`
};

for (const [name, content] of Object.entries(CAMPAIGN_FILES)) {
  writeFileSync(join(AGENCY_DIR, 'campaigns/first-revenue', name), content, 'utf-8');
}

const CAMPAIGN_STATE = {
  campaign_id: "FIRST-REVENUE-V3",
  campaign_mode: "PRODUCTION",
  status: "EXECUTING",
  offer_id: "HUY-AUTO-PILOT-4900",
  entry_offer: "Đánh giá cơ hội tự động hóa 15 phút (0 VND)",
  paid_offer: "AI Automation Pilot (4,900,000 VND)",
  icp_primary: "SME Cơ khí / Sản xuất",
  primary_channel: "GOOGLE_SEARCH",
  funnel_actual: {
    impressions: 0,
    clicks: 0,
    form_submits: 0,
    consented_leads: 0,
    qualified_leads: 0,
    audits_booked: 0,
    proposals_sent: 0,
    customer_acceptances: 0,
    verified_paid_orders: 0
  },
  last_checkpoint: "CHK-REV3-BOOTSTRAP",
  last_updated: new Date().toISOString()
};
writeFileSync(join(AGENCY_DIR, 'campaigns/first-revenue', 'STATE.json'), JSON.stringify(CAMPAIGN_STATE, null, 2), 'utf-8');

// 3. MATERIALIZE SKILLS (SKILL-FR-00 to SKILL-FR-13) (Section 35)
console.log('[REV3-SETUP] Materializing 14 Skills for Campaign V3...');
const SKILLS_FR = [
  { id: "SKILL-FR-00", name: "campaign_supervisor", mission: "Drive system toward FIRST_VERIFIED_PAID_ORDER via observe, plan, dispatch, verify, repair, checkpoint." },
  { id: "SKILL-FR-01", name: "context_hydrator", mission: "Load canonical context in strict precedence order before task execution." },
  { id: "SKILL-FR-02", name: "evidence_guard", mission: "Enforce No Evidence -> No Fact -> No Claim -> No Revenue." },
  { id: "SKILL-FR-03", name: "intent_qualifier", mission: "Transform real form submission into structured facts, hypotheses, unknowns, and ICP score (A1)." },
  { id: "SKILL-FR-04", name: "sdr", mission: "Prepare acknowledgement, qualify, schedule audit, draft proposal without fabricating facts (A2)." },
  { id: "SKILL-FR-05", name: "crm_state_manager", mission: "Enforce strict state machine transitions with attached evidence only (A3)." },
  { id: "SKILL-FR-06", name: "payment_verifier", mission: "Validate SePay webhook, signature, timestamp, duplicate, order match, amount match deterministically." },
  { id: "SKILL-FR-07", name: "n8n_operator", mission: "Deploy, monitor, and maintain n8n workflows without embedding raw secrets." },
  { id: "SKILL-FR-08", name: "conversion_engineer", mission: "Build and maintain /automation-pilot landing page, form, rate limiting, bot protection." },
  { id: "SKILL-FR-09", name: "war_room_analyst", mission: "Present truth-only War Room metrics in AdminCenter with zero mock numbers." },
  { id: "SKILL-FR-10", name: "recovery_supervisor", mission: "Bounded retries, provider fallback, and state recovery before human escalation." },
  { id: "SKILL-FR-11", name: "learning_curator", mission: "Convert operational insights into evaluation examples, prompt and skill improvements." },
  { id: "SKILL-FR-12", name: "privacy_guard", mission: "Protect customer PII and ensure raw data is not leaked into public training sets." },
  { id: "SKILL-FR-13", name: "human_gate_manager", mission: "Enforce R3/R4 gate stops and prevent silent risk downgrades." }
];

for (const s of SKILLS_FR) {
  const dirPath = join(AGENCY_DIR, 'skills/first-revenue', `${s.id}_${s.name}`);
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

  const content = `---
skill_id: ${s.id}
campaign_id: FIRST-REVENUE-V3
role: ${s.name.toUpperCase()}
mission: "${s.mission}"
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

# ${s.id} — ${s.name.toUpperCase()}
## Mission
${s.mission}

## Operating Protocol
Strictly adhere to Master Directive V3.0. Never fabricate commercial progress.
`;
  writeFileSync(join(dirPath, 'SKILL.md'), content, 'utf-8');
}

// 4. TASK CONTRACTS (Section 22)
console.log('[REV3-SETUP] Generating initial TaskContracts...');
const TASKS_REV3 = [
  {
    task_id: "REV3-008-LANDING-PAGE",
    campaign_id: "FIRST-REVENUE-V3",
    objective: "Implement Next.js /automation-pilot landing page with hero, problem, scope, and single CTA",
    task_type: "FIRST_REVENUE.LANDING",
    owner_agent: "L3-02_SENIOR_DEVELOPER",
    capability: "web_nextjs_build",
    input_refs: ["campaigns/first-revenue/OFFER.md"],
    expected_output: ["apps/control-center/src/app/automation-pilot/page.tsx"],
    risk_class: "R2",
    status: "READY"
  },
  {
    task_id: "REV3-010-DURABLE-INGRESS",
    campaign_id: "FIRST-REVENUE-V3",
    objective: "Implement durable write-first API route /api/automation-pilot/submit writing to Supabase and PGMQ",
    task_type: "FIRST_REVENUE.INGRESS",
    owner_agent: "L3-02_SENIOR_DEVELOPER",
    capability: "durable_ingress",
    input_refs: ["supabase/migrations/20261001000001_first_revenue_v3.sql"],
    expected_output: ["apps/control-center/src/app/api/automation-pilot/submit/route.ts"],
    risk_class: "R2",
    status: "READY"
  },
  {
    task_id: "REV3-016-SEPAY-WEBHOOK",
    campaign_id: "FIRST-REVENUE-V3",
    objective: "Implement SePay webhook handler with signature check, idempotency, order matching, and audit logging",
    task_type: "FIRST_REVENUE.PAYMENT_WEBHOOK",
    owner_agent: "L3-02_SENIOR_DEVELOPER",
    capability: "payment_verification",
    input_refs: ["campaigns/first-revenue/PAYMENT_POLICY.md"],
    expected_output: ["apps/control-center/src/app/api/payment/sepay/webhook/route.ts"],
    risk_class: "R2",
    status: "READY"
  }
];

for (const t of TASKS_REV3) {
  const tPath = join(AGENCY_DIR, 'workstreams/first-revenue/TASKS', `${t.task_id}.json`);
  writeFileSync(tPath, JSON.stringify(t, null, 2), 'utf-8');
}

console.log('✅ [REV3-SETUP] Campaign V3 structures and TaskContracts materialized successfully!');
