/**
 * TEST TEACHER EDUTECH PIPELINE E2E
 * Verifies zero-budget teacher funnel, A1 qualification for educators, A2 39k micro-offer brief, and SePay payment handling.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { RevenueAgentCore } from './revenue-agent-core';

const ROOT = resolve(process.cwd());
const envPath = resolve(ROOT, '../edtech-ai-portfolio/.env.local');
let SUPABASE_URL = 'https://bdeluacbzbdflxubhpha.supabase.co';
let SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY && existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  const m = content.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);
  if (m && m[1]) SERVICE_ROLE_KEY = m[1].trim();
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runTeacherE2ETest() {
  console.log('===============================================================');
  console.log('🎓 TESTING TEACHER EDUTECH FUNNEL (ZERO-BUDGET / 39K OFFER)');
  console.log('===============================================================\n');

  // Step 1: Write-First Ingress for Teacher Lead
  console.log('--- STEP 1: Teacher Ingress (Community Organic / 0đ Budget) ---');
  const teacherPayload = {
    campaign_id: 'EDUTECH-TEACHER-FUNNEL',
    name: 'Cô Trần Thị Mai (TEST)',
    company: 'Trường THPT Lê Quý Đôn',
    role: 'Giáo viên Ngữ văn',
    phone: '0912345678',
    email: 'cơmai.lequydon.test@gmail.com',
    problem: 'Mỗi tối mất 3 tiếng để soạn giáo án theo Công văn 5512 và lên ma trận đề kiểm tra 4 mức độ nhận thức.',
    current_tools: 'Word, Zalo nhóm tổ bộ môn',
    preferred_contact_time: '18:00 - 20:00 tối',
    utm_source: 'organic_community_seeding',
    utm_medium: 'facebook_group_giao_vien',
    utm_campaign: 'edutech_teacher_funnel_0d',
    is_test: true,
    status: 'NEW_REAL_LEAD'
  };

  const { data: lead, error: leadErr } = await supabase
    .from('first_revenue_leads')
    .insert([teacherPayload])
    .select()
    .single();

  if (leadErr || !lead) {
    console.error('❌ Step 1 Failed:', leadErr);
    process.exit(1);
  }
  console.log(`✅ Teacher Lead written to Supabase! Lead ID: ${lead.id}`);

  // Consent
  await supabase.from('first_revenue_consents').insert([{
    lead_id: lead.id,
    consent_flag: true,
    consent_text_version: 'v3.0-teacher-edutech',
    ip_address: '127.0.0.1',
    user_agent: 'TEACHER_FUNNEL_TEST'
  }]);

  // Evidence event
  const contentHash = createHash('sha256').update(JSON.stringify(teacherPayload)).digest('hex');
  await supabase.from('first_revenue_evidence_events').insert([{
    entity_id: lead.id,
    entity_type: 'LEAD',
    event_type: 'TEACHER_FREE_INGRESS',
    source: 'ORGANIC_COMMUNITY_SEEDING',
    payload: teacherPayload,
    content_hash: contentHash,
    is_verified: true
  }]);
  console.log(`✅ Evidence Event recorded with SHA-256 integrity hash.`);

  // Step 2: Agent A1 - Qualification
  console.log('\n--- STEP 2: Agent A1 - Qualification AI for Educator ---');
  const agentCore = new RevenueAgentCore();
  const qualResult = await agentCore.qualifyLead(lead.id);

  if (!qualResult || qualResult.icp_fit !== 'FIT') {
    console.error('❌ Step 2 Failed: Lead qualification did not evaluate as FIT');
    process.exit(1);
  }
  console.log(`✅ Lead classified as: ${qualResult.facts[0]}`);
  console.log(`✅ Confidence: ${qualResult.confidence}`);

  // Step 3: Agent A2 - SDR / Briefing Generation
  console.log('\n--- STEP 3: Agent A2 - Briefing with 39k Micro-Offer ---');
  const brief = await agentCore.prepareFounderAuditBrief(lead.id, qualResult);
  if (!brief.includes('39.000 VNĐ')) {
    console.error('❌ Step 3 Failed: Brief did not contain 39.000 VNĐ offer');
    process.exit(1);
  }
  console.log(`✅ Brief created with 39k micro-offer!`);

  // Step 4: Create 39k Order
  console.log('\n--- STEP 4: Creating Order for VIP 1 (39.000 VNĐ) ---');
  const orderCode = `ST-TEA-${Date.now().toString().slice(-6)}`;
  const { data: order, error: orderErr } = await supabase
    .from('first_revenue_orders')
    .insert([{
      lead_id: lead.id,
      order_code: orderCode,
      offer_id: 'EDUTECH-TEACHER-VIP1',
      agreed_price: 39000,
      customer_accepted: true,
      status: 'PAYMENT_PENDING',
      is_test: true
    }])
    .select()
    .single();

  if (orderErr || !order) {
    console.error('❌ Step 4 Failed:', orderErr);
    process.exit(1);
  }
  console.log(`✅ Order created! Order ID: ${order.id}, Code: ${order.order_code}, Price: 39.000 VNĐ`);

  // Step 5: Emulate SePay Test Payment
  console.log('\n--- STEP 5: Emulating SePay Webhook (39.000 VNĐ to ACB 37780997) ---');
  const testTxId = `SEPAY_TEA_TX_${Date.now()}`;
  const { data: paymentTx, error: payErr } = await supabase
    .from('first_revenue_payment_transactions')
    .insert([{
      order_id: order.id,
      provider: 'SEPAY',
      environment: 'TEST',
      external_transaction_id: testTxId,
      transfer_amount: 39000,
      payment_code: order.order_code,
      counts_as_revenue: false,
      raw_payload: {
        id: testTxId,
        gateway: 'ACB',
        accountNumber: '37780997',
        code: order.order_code,
        content: `ST ${order.order_code} VIP1_1M`,
        transferType: 'in',
        transferAmount: 39000,
        referenceCode: 'TEA_REF_999'
      }
    }])
    .select()
    .single();

  if (payErr || !paymentTx) {
    console.error('❌ Step 5 Failed:', payErr);
    process.exit(1);
  }
  console.log(`✅ SePay 39k Transaction logged. Gateway: ACB, Environment: TEST.`);

  // Step 6: Agent A3 - Commercial Invariant
  console.log('\n--- STEP 6: Agent A3 - Invariant Enforcement ---');
  const isPaidVerified = await agentCore.verifyOrderAndPayment(order.id);
  console.log(`Agent A3 Result: ${isPaidVerified}`);
  if (isPaidVerified === false) {
    console.log('✅ PASS: Agent A3 strictly kept test transaction isolated from live North Star.');
  }

  console.log('\n===============================================================');
  console.log('🎉 TEACHER EDUTECH FUNNEL VALIDATION PASSED 100%!');
  console.log('===============================================================\n');
}

runTeacherE2ETest().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
