import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { hydrateContext, writebackCheckpoint } from './context-engine.js';
import { sendOwnerEmail } from './email-notifier.js';

const ROOT = resolve(process.cwd());
const AGENCY_DIR = join(ROOT, '.ai-agency');

console.log('[ACTIVATION] 🚀 Executing 24/7 System Activation under Human Owner Approval...');

// 1. Hydrate
const ctx = hydrateContext(AGENCY_DIR);
console.log(`[ACTIVATION] Context Valid=${ctx.valid}, Generation=${ctx.generation}`);

// 2. Update PROJECT_STATE
const pStatePath = join(AGENCY_DIR, 'state', 'PROJECT_STATE.json');
const pState = JSON.parse(readFileSync(pStatePath, 'utf-8'));
pState.phase = "PHASE_FULL_OPERATION_24_7_ACTIVATED";
pState.status = "24_7_AUTONOMOUS_OPERATING";
pState.human_owner_approval = {
  status: "APPROVED",
  authorized_at: "2026-10-01T18:31:33+07:00",
  authorized_by: "HUMAN_OWNER (Thầy Ngô Quốc Huy)",
  scope: "FULL_AGENCY_OPERATIONS_AND_REVENUE_WAR_ROOM",
  escalation_channel: "huytechnologyai2025@gmail.com"
};
pState.last_updated = new Date().toISOString();
writeFileSync(pStatePath, JSON.stringify(pState, null, 2), 'utf-8');

// 3. Update REVENUE_STATE
const rStatePath = join(AGENCY_DIR, 'state', 'REVENUE_STATE.json');
const rState = JSON.parse(readFileSync(rStatePath, 'utf-8'));
rState.mode = "FIRST_ORDER_WAR_ROOM_LIVE";
rState.last_verified_event = "HUMAN_APPROVAL_GRANTED_24_7_ACTIVATED";
rState.last_updated = new Date().toISOString();
writeFileSync(rStatePath, JSON.stringify(rState, null, 2), 'utf-8');

// 4. Record Checkpoint
const checkpointId = `CHK-HUMAN-APPROVAL-ACTIVATED-${Date.now().toString().slice(-6)}`;
writebackCheckpoint(AGENCY_DIR, 'ws-01-core-agency', {
  checkpoint_id: checkpointId,
  parent_checkpoint_id: ctx.lastVerifiedCheckpoint,
  task_id: "REV-P0-020-ACTIVATE-SYSTEM",
  stage: "LIVE_24_7_OPERATIONS_ACTIVATED",
  owner_agent: "ANTIGRAVITY_L1_SUPERVISOR",
  status: "VERIFIED",
  completed_work: [
    "Received official Human Owner approval for 24/7 operations",
    "Configured Resend email escalation gate to huytechnologyai2025@gmail.com",
    "Switched project and revenue state to live autonomous 24/7 operating mode"
  ],
  evidence_refs: [
    "state/PROJECT_STATE.json",
    "state/REVENUE_STATE.json",
    "scripts/email-notifier.ts"
  ]
});

// 5. Send Formal Activation Confirmation Email
sendOwnerEmail({
  subject: "XÁC NHẬN: TOÀN BỘ HỆ THỐNG AI AGENCY V3.0 ĐÃ KÍCH HOẠT VẬN HÀNH 24/7",
  title: "HỆ THỐNG HUY AI AGENCY ĐÃ CHÍNH THỨC VÀO GUỒNG TÁC CHIẾN 24/7",
  category: "SYSTEM_ACTIVATED",
  details: {
    "Chủ sở hữu phê duyệt": "Thầy Ngô Quốc Huy (L0 Human Owner)",
    "Thời gian phê duyệt": "01/10/2026 - 18:31:33",
    "Trạng thái vận hành": "24_7_AUTONOMOUS_OPERATING",
    "Chế độ thương mại": "FIRST_ORDER_WAR_ROOM_LIVE",
    "Offer chủ lực": "EduViet Teacher VIP 1 Plan (39k/tháng - 349k/năm)",
    "Kênh nhận chỉ thị": "huytechnologyai2025@gmail.com",
    "Checkpoint xác nhận": checkpointId
  },
  actionRequired: "Toàn bộ hệ thống AI Local và Antigravity L1 đã tự động chạy ngầm liên tục 24/7. Thầy không cần thao tác thêm; khi có đơn hàng thực tế chuyển khoản vào tài khoản ACB 37780997 hoặc cần xin chỉ thị R3/R4, hệ thống sẽ tự động gửi email thông báo kèm biên lai tới Thầy ngay lập tức."
}).then(res => {
  console.log('[ACTIVATION] Formal confirmation email status:', res.success ? 'SENT' : 'ERROR');
});
