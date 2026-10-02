import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(process.cwd());
const AGENCY_DIR = join(ROOT, '.ai-agency');

console.log('[REVENUE-V1] Initializing Revenue Operating System V1.0...');

// 1. Create Directories
const DIRS = [
  'context/revenue',
  'state',
  'skills/revenue',
  'workstreams/ws-04-revenue-war-room',
  'workstreams/ws-04-revenue-war-room/TASKS',
  'workstreams/ws-04-revenue-war-room/CHECKPOINTS',
  'workstreams/ws-04-revenue-war-room/EVIDENCE',
  'workstreams/ws-04-revenue-war-room/OUTPUTS'
];

for (const d of DIRS) {
  const p = join(AGENCY_DIR, d);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

// 2. CONTEXT PACKAGE (11 Files)
const CONTEXT_REVENUE_FILES: Record<string, string> = {
  'REVENUE_MISSION.md': `# REVENUE MISSION — 24/7 FIRST VERIFIED PAID ORDER
**Single Objective:** FIRST_VERIFIED_PAID_ORDER.
**Target Count:** 1 Real Customer Payment.
**No-Fake Policy:** Never count likes, bot chats, mock forms, AI-invented leads, unverified proposals, or manual PAID flags without financial evidence.
`,
  'FIRST_REVENUE_OFFER.md': `# FIRST REVENUE OFFER
**Primary Offer (Fastest Time-to-Cash):** EduViet Teacher Pro / VIP 1 Plan
- **Price:** 39,000 VNĐ / tháng (Gói trải nghiệm) hoặc 349,000 VNĐ / năm (Gói đầy đủ).
- **Customer Value:** Soạn giáo án chuẩn CV 5512 & 2634, ma trận đặc tả đề thi Thông tư 22, Mini game, Slide và Sơ đồ tư duy trong 3 phút.
- **Payment Method:** VietQR động quét trực tiếp vào STK: 37780997 (Ngân hàng ACB - Chi nhánh Tân Mai - NGO QUOC HUY).
- **Secondary Offer (High-Ticket SME):** Gói Khảo Sát Tự Động Hóa AI (AI Automation Audit + Pilot) dành cho Trung tâm Đào tạo & Doanh nghiệp SME.
`,
  'ICP_CONTEXT.md': `# IDEAL CUSTOMER PROFILE (ICP)
1. **Giáo viên Tiểu học, THCS, THPT tại Việt Nam:**
   - Đang gặp áp lực soạn giáo án đổi mới theo Thông tư 5512, sổ điểm, đề kiểm tra.
   - Thường xuyên tương tác trên mạng xã hội giáo dục, Zalo, diễn đàn giáo viên.
   - Sẵn sàng chi trả 39k - 349k để tiết kiệm hàng chục giờ soạn bài mỗi tuần.
2. **Hiệu trưởng / Tổ trưởng chuyên môn / Trung tâm luyện thi:**
   - Cần bản quyền cho tổ bộ môn (Gói School / Team).
3. **Chủ doanh nghiệp SME / Trung tâm đào tạo nghề:**
   - Cần tự động hóa luồng tiếp nhận khách hàng, CSKH 24/7 và xử lý văn bản nội bộ.
`,
  'CHANNEL_POLICY.md': `# CHANNEL POLICY
- **Approved Channels:**
  1. Website chính thức (https://www.gvcncdsai.io.vn & https://huycncdsai.io.vn)
  2. Zalo OA chính thức
  3. Fanpage Facebook & Nhóm giáo viên thực tế
  4. LinkedIn Business
- **Forbidden:** Spam tin nhắn hàng loạt, gửi tin nhắn tự động khi người dùng chưa đồng ý, cào dữ liệu cá nhân nhạy cảm, bot tự chat với nhau để tạo tương tác ảo.
`,
  'SALES_POLICY.md': `# SALES POLICY
- **Logic tiếp cận:** Quan sát vấn đề thực tế ➔ Đề xuất giải pháp cụ thể có bằng chứng ➔ Kêu gọi hành động không rủi ro (Dùng thử miễn phí / Xem demo giáo án chuẩn).
- **Pipeline Stages:**
  DISCOVERED ➔ VERIFIED ➔ QUALIFIED ➔ CONTACTABLE ➔ CONTACTED ➔ REPLIED ➔ DISCOVERY ➔ DEMO ➔ PROPOSAL ➔ NEGOTIATION ➔ PAYMENT_PENDING ➔ PAID.
- **Stage Transition Rule:** Mọi bước chuyển giai đoạn BẮT BUỘC có bằng chứng (ảnh chụp, mã tin nhắn, phản hồi thật của khách, mã giao dịch).
`,
  'PRICING_POLICY.md': `# PRICING POLICY
- **EduViet VIP 1 (1 Tháng):** 39,000 VNĐ (Không được giảm dưới mức này).
- **EduViet VIP 1 (1 Năm):** 349,000 VNĐ.
- **EduViet VIP 2 (Trọn đời/Nâng cao):** 590,000 VNĐ.
- **Gói Trường học / Tổ bộ môn:** Báo giá theo số lượng giáo viên (Tối thiểu 1,500,000 VNĐ/năm).
- **Cấm tự ý chiết khấu:** AI không được giảm giá dưới mức sàn quy định.
`,
  'CRM_STAGE_POLICY.md': `# CRM STAGE POLICY
- Không nguồn ➔ Không xác nhận Lead.
- Không có phản hồi thật từ khách hàng ➔ Không chuyển sang Giai đoạn Hội thoại (Conversation).
- Không có sự đồng ý của khách hàng ➔ Không tính Cơ hội thành công (Won).
- Không có chứng từ ngân hàng / mã giao dịch ➔ Không đánh dấu PAID.
`,
  'REVENUE_EVIDENCE_POLICY.md': `# REVENUE EVIDENCE POLICY
Bằng chứng doanh thu hợp lệ gồm:
1. Mã giao dịch ngân hàng ACB (Transaction ID).
2. Biên lai chuyển khoản ngân hàng (Bank transfer receipt).
3. Webhook thông báo thanh toán hợp lệ từ cổng thanh toán.
4. Xác nhận có tiền vào tài khoản thực tế từ Human Owner (Thầy Ngô Quốc Huy).
`,
  'PAYMENT_POLICY.md': `# PAYMENT POLICY
- Thông tin thụ hưởng chính thức duy nhất:
  - Ngân hàng: ACB (TMCP Á Châu)
  - Số tài khoản: 37780997
  - Tên thụ hưởng: NGO QUOC HUY
  - Chi nhánh: Tân Mai
- Cú pháp chuyển khoản định danh: \`STS [Mã đồng bộ] [Mã gói]\` (Ví dụ: \`STS HUY801 VIP1\`).
`,
  'CUSTOMER_SUCCESS_POLICY.md': `# CUSTOMER SUCCESS POLICY
- Kích hoạt bản quyền tức thời khi thanh toán được xác nhận.
- Cung cấp video và tài liệu hướng dẫn sử dụng giáo án CV 5512 trong 15 phút đầu tiên.
- Thu thập phản hồi thực tế từ giáo viên để liên tục cải tiến hệ sinh thái.
`,
  'REVENUE_GLOSSARY.md': `# REVENUE GLOSSARY
- **First-Order War Room:** Chế độ tác chiến ưu tiên cao nhất toàn tập đoàn cho đến khi có đơn hàng trả tiền đầu tiên.
- **Real Lead:** Thực thể kinh doanh hoặc cá nhân có thật, có địa chỉ liên hệ và có nhu cầu được chứng minh.
- **Evidence-First:** Nguyên tắc chỉ ghi nhận kết quả khi có bằng chứng khách quan, loại bỏ số liệu ảo.
`
};

for (const [fName, content] of Object.entries(CONTEXT_REVENUE_FILES)) {
  writeFileSync(join(AGENCY_DIR, 'context/revenue', fName), content, 'utf-8');
}

// 3. STATE PACKAGE (5 Files)
const REVENUE_STATE = {
  mode: "FIRST_ORDER_WAR_ROOM",
  north_star: "FIRST_VERIFIED_PAID_ORDER",
  target_paid_orders: 1,
  first_revenue_offer: "EduViet Teacher VIP 1 Plan (39k trial / 349k year)",
  verified_prospects: 0,
  qualified_leads: 0,
  real_conversations: 0,
  meetings: 0,
  proposals: 0,
  payment_pending: 0,
  verified_paid_orders: 0,
  verified_revenue_vnd: 0,
  current_bottleneck: "CONVERT_TRAFFIC_TO_FIRST_PAID_ORDER",
  last_verified_event: "SYSTEM_INITIALIZED",
  last_updated: new Date().toISOString()
};
writeFileSync(join(AGENCY_DIR, 'state', 'REVENUE_STATE.json'), JSON.stringify(REVENUE_STATE, null, 2), 'utf-8');

const FUNNEL_STATE = {
  funnel: {
    targets: {
      verified_prospects: 100,
      qualified_leads: 30,
      real_conversations: 10,
      demos_or_discovery: 3,
      proposals: 2,
      paid_orders: 1
    },
    actual: {
      verified_prospects: 0,
      qualified_leads: 0,
      real_conversations: 0,
      demos_or_discovery: 0,
      proposals: 0,
      paid_orders: 0
    }
  }
};
writeFileSync(join(AGENCY_DIR, 'state', 'FUNNEL_STATE.json'), JSON.stringify(FUNNEL_STATE, null, 2), 'utf-8');

const CHANNEL_STATE = {
  channels: [
    { name: "Website EduViet (gvcncdsai.io.vn)", status: "ONLINE_ACTIVE", type: "INBOUND_SELF_SERVE", conversion_path: "/#pricing" },
    { name: "Website AdminCenter (huycncdsai.io.vn)", status: "ONLINE_ACTIVE", type: "INBOUND_ENTERPRISE", conversion_path: "/admincenter" },
    { name: "Zalo OA", status: "READY_FOR_ENGAGEMENT", type: "TWO_WAY_CHAT" },
    { name: "VietQR Banking Direct", status: "ONLINE_ACTIVE", type: "ACB_37780997" }
  ]
};
writeFileSync(join(AGENCY_DIR, 'state', 'CHANNEL_STATE.json'), JSON.stringify(CHANNEL_STATE, null, 2), 'utf-8');

const ACTIVE_OPPORTUNITIES = {
  opportunities: []
};
writeFileSync(join(AGENCY_DIR, 'state', 'ACTIVE_OPPORTUNITIES.json'), JSON.stringify(ACTIVE_OPPORTUNITIES, null, 2), 'utf-8');

const FIRST_ORDER_STATE = {
  war_room_status: "ACTIVE",
  order_target: 1,
  verified_paid_orders: 0,
  top_prospects: [],
  top_leads: [],
  top_conversations: [],
  top_opportunities: [],
  closest_to_payment: null,
  stop_condition_met: false
};
writeFileSync(join(AGENCY_DIR, 'state', 'FIRST_ORDER_STATE.json'), JSON.stringify(FIRST_ORDER_STATE, null, 2), 'utf-8');

// 4. REVENUE SKILLS PACK (17 Skills: REV-SKILL-00 to REV-SKILL-16)
console.log('[REVENUE-V1] Materializing 17 Revenue Skills...');
const REV_SKILLS = [
  { id: "REV-SKILL-00", name: "revenue_objective_guard", mission: "Keep the entire AI workforce strictly focused on generating the first verified paid order.", risk: "R0" },
  { id: "REV-SKILL-01", name: "real_entity_verifier", mission: "Verify authentic business entities or teachers via official websites, public registries, and social pages.", risk: "R0" },
  { id: "REV-SKILL-02", name: "need_signal_analyzer", mission: "Extract evidence-backed operational pain (lesson plan workload, manual grading, administrative overhead).", risk: "R0" },
  { id: "REV-SKILL-03", name: "lead_scorer", mission: "Score verified leads objectively based on need, fit, contactability, and timing.", risk: "R0" },
  { id: "REV-SKILL-04", name: "channel_compliance_guard", mission: "Enforce zero spam, privacy compliance, and authorized communication channels only.", risk: "R0" },
  { id: "REV-SKILL-05", name: "personalization_worker", mission: "Personalize consultation notes and outreach using verified pedagogical context.", risk: "R1" },
  { id: "REV-SKILL-06", name: "outreach_orchestrator", mission: "Dispatch targeted, low-volume, authorized value messages without mass spam.", risk: "R1" },
  { id: "REV-SKILL-07", name: "reply_classifier", mission: "Accurately classify inbound responses from real customers vs internal test traffic.", risk: "R0" },
  { id: "REV-SKILL-08", name: "opportunity_manager", mission: "Manage evidence-gated CRM pipeline transitions from discovery to proposal.", risk: "R1" },
  { id: "REV-SKILL-09", name: "proposal_builder", mission: "Generate tailored commercial proposals and dynamic VietQR invoices based on real client needs.", risk: "R1" },
  { id: "REV-SKILL-10", name: "payment_verifier", mission: "Validate real banking transactions (ACB 37780997), receipts, and issue license unlocks.", risk: "R1" },
  { id: "REV-SKILL-11", name: "commercial_evidence_auditor", mission: "Audit daily pipeline for duplicate leads, fake interactions, or unverified orders.", risk: "R1" },
  { id: "REV-SKILL-12", name: "funnel_analyst", mission: "Analyze conversion bottlenecks and recommend adjustments to messaging, offer, or pricing.", risk: "R0" },
  { id: "REV-SKILL-13", name: "content_to_lead_router", mission: "Link educational blog posts, social case studies, and guides directly to lead capture forms.", risk: "R1" },
  { id: "REV-SKILL-14", name: "seo_revenue_router", mission: "Direct search engine optimization toward high-commercial-intent teacher keywords.", risk: "R1" },
  { id: "REV-SKILL-15", name: "customer_success_handoff", mission: "Deliver instantaneous onboarding, tutorials, and license confirmation upon paid order.", risk: "R1" },
  { id: "REV-SKILL-16", name: "revenue_recovery", mission: "Resume interrupted commercial workflows, retry idempotent webhooks, and log checkpoints.", risk: "R2" }
];

for (const s of REV_SKILLS) {
  const dirPath = join(AGENCY_DIR, 'skills/revenue', `${s.id}_${s.name}`);
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

  const content = `---
skill_id: ${s.id}
level: REVENUE_ENGINE
role: ${s.name.toUpperCase()}
mission: "${s.mission}"
risk_ceiling: ${s.risk}
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

# ${s.id} — ${s.name.toUpperCase()}
## Mission
${s.mission}

## Operating Principles
1. **Evidence-First:** Never fabricate prospects, leads, replies, or payments.
2. **Deterministic Validation:** Real source URL, contact path, and bank reference required.
3. **Continuous Alignment:** Prioritize actions that bring the system closer to the first verified payment.
`;
  writeFileSync(join(dirPath, 'SKILL.md'), content, 'utf-8');
}

// 5. UPDATE CONTEXT_MANIFEST
const manifestPath = join(AGENCY_DIR, 'CONTEXT_MANIFEST.json');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const newCanonical = [
    'context/revenue/REVENUE_MISSION.md',
    'context/revenue/FIRST_REVENUE_OFFER.md',
    'context/revenue/REVENUE_EVIDENCE_POLICY.md',
    'context/revenue/PAYMENT_POLICY.md',
    'state/REVENUE_STATE.json',
    'state/FIRST_ORDER_STATE.json'
  ];
  for (const c of newCanonical) {
    if (!manifest.canonical_files.includes(c)) manifest.canonical_files.push(c);
    const full = join(AGENCY_DIR, c);
    if (existsSync(full)) {
      const data = readFileSync(full);
      manifest.hashes[c] = createHash('sha256').update(data).digest('hex');
    }
  }
  manifest.context_generation = (manifest.context_generation || 1) + 1;
  manifest.last_updated = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

console.log('✅ [REVENUE-V1] Revenue Operating System V1.0 initialized successfully!');
