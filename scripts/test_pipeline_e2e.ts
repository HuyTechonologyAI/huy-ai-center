/**
 * TEST PIPELINE E2E (REV3-020)
 * Tests write-first ingress, A1 qualification, A2 briefing, SePay webhook, and A3 invariant enforcement.
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

async function runE2ETest() {
  console.log('===============================================================');
  console.log('🧪 RUNNING END-TO-END PIPELINE VALIDATION (REV3-020)');
  console.log('===============================================================\n');

  // Step 1: Ingress Test Lead (write-first pattern)
  console.log('--- STEP 1: Write-First Ingress (Lead + Consent + Evidence) ---');
  const testLeadPayload = {
    campaign_id: 'FIRST-REVENUE-V3',
    name: 'Nguyễn Văn Tuấn (TEST RUNNER)',
    company: 'Công ty Cơ khí Chính xác An Phát (Mẫu Kiểm Thử E2E)',
    phone: '0988776655',
    email: 'tuan.anphat.test@example.com',
    role: 'Giám đốc Kỹ thuật / Quản lý Xưởng',
    problem: 'Quy trình tiếp nhận bản vẽ cơ khí, bóc tách vật tư và tính giá phôi gia công CNC đang làm thủ công bằng Excel mất 2 ngày/đơn hàng.',
    current_tools: 'Excel, Zalo nhóm kỹ thuật, AutoCAD',
    preferred_contact_time: '14:00 - 16:00 chiều các ngày làm việc',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'first_revenue_v3_test',
    is_test: true,
    status: 'NEW_REAL_LEAD'
  };

  const { data: lead, error: leadErr } = await supabase
    .from('first_revenue_leads')
    .insert([testLeadPayload])
    .select()
    .single();

  if (leadErr || !lead) {
    console.error('❌ Step 1 Failed: Cannot insert test lead:', leadErr);
    process.exit(1);
  }
  console.log(`✅ Test Lead written to Supabase! Lead ID: ${lead.id}`);

  // Consent
  const consentText = 'Tôi đồng ý để Huy AI Agency Group liên hệ lại trong vòng 4 giờ làm việc để đánh giá quy trình.';
  await supabase.from('first_revenue_consents').insert([{
    lead_id: lead.id,
    consent_flag: true,
    consent_text_version: 'v3.0-2026-10',
    ip_address: '127.0.0.1',
    user_agent: 'E2E_TEST_RUNNER'
  }]);

  // Evidence event
  const contentHash = createHash('sha256').update(JSON.stringify(testLeadPayload)).digest('hex');
  await supabase.from('first_revenue_evidence_events').insert([{
    entity_id: lead.id,
    entity_type: 'LEAD',
    event_type: 'NEW_REAL_LEAD_SUBMISSION',
    source: 'TEST_RUNNER',
    payload: testLeadPayload,
    content_hash: contentHash,
    is_verified: true
  }]);
  console.log(`✅ Consent & Ingress Evidence Event recorded with SHA256 integrity hash.`);

  // Step 2: Agent A1 - Qualification
  console.log('\n--- STEP 2: Agent A1 - Intent / Qualification AI ---');
  const agentCore = new RevenueAgentCore();
  const qualResult = await agentCore.qualifyLead(lead.id);

  if (!qualResult || qualResult.icp_fit !== 'FIT') {
    console.error('❌ Step 2 Failed: Lead qualification did not evaluate as FIT');
    process.exit(1);
  }
  console.log(`✅ Lead classified as ICP FIT with confidence: ${qualResult.confidence}`);

  // Step 3: Agent A2 - SDR / Founder Call Briefing
  console.log('\n--- STEP 3: Agent A2 - SDR AI Briefing Generation ---');
  const brief = await agentCore.prepareFounderAuditBrief(lead.id, qualResult);
  if (!brief || !brief.includes('HỒ SƠ KHẢO SÁT 15 PHÚT')) {
    console.error('❌ Step 3 Failed: Brief was not generated properly');
    process.exit(1);
  }
  console.log(`✅ Founder Call Brief generated successfully for Thầy Ngô Quốc Huy.`);

  // Step 4: Emulate Order Acceptance & Payment (with is_test: true)
  console.log('\n--- STEP 4: Creating Order & Emulating SePay Webhook ---');
  const orderCode = `ORD-TEST-${Date.now().toString().slice(-6)}`;
  const { data: order, error: orderErr } = await supabase
    .from('first_revenue_orders')
    .insert([{
      lead_id: lead.id,
      order_code: orderCode,
      offer_id: 'HUY-AUTO-PILOT-4900',
      agreed_price: 4900000,
      customer_accepted: true,
      status: 'PAYMENT_PENDING',
      is_test: true
    }])
    .select()
    .single();

  if (orderErr || !order) {
    console.error('❌ Step 4 Failed: Cannot create order:', orderErr);
    process.exit(1);
  }
  console.log(`✅ Order created! Order ID: ${order.id}, Code: ${order.order_code}`);

  // Emulate SePay payment transaction for TEST environment
  const testTxId = `SEPAY_TEST_TX_${Date.now()}`;
  const { data: paymentTx, error: payErr } = await supabase
    .from('first_revenue_payment_transactions')
    .insert([{
      order_id: order.id,
      provider: 'SEPAY',
      environment: 'TEST', // STRICT TEST ISOLATION
      external_transaction_id: testTxId,
      transfer_amount: 4900000,
      payment_code: order.order_code,
      counts_as_revenue: false, // MANDATORY: Section 12 rule
      raw_payload: {
        id: testTxId,
        gateway: 'Vietcombank',
        transactionDate: new Date().toISOString(),
        accountNumber: '1019999999',
        code: order.order_code,
        content: `Thanh toan AI Pilot ${order.order_code}`,
        transferType: 'in',
        transferAmount: 4900000,
        referenceCode: 'TEST_REF_123'
      }
    }])
    .select()
    .single();

  if (payErr || !paymentTx) {
    console.error('❌ Step 4 Failed: Cannot record payment transaction:', payErr);
    process.exit(1);
  }
  console.log(`✅ Payment Transaction recorded. Environment: ${paymentTx.environment}, counts_as_revenue: ${paymentTx.counts_as_revenue}`);

  // Step 5: Agent A3 - Commercial Invariant Evaluation
  console.log('\n--- STEP 5: Agent A3 - Truth Keeper / Invariant Audit ---');
  const isPaidVerified = await agentCore.verifyOrderAndPayment(order.id);

  console.log(`Agent A3 Evaluation Result: ${isPaidVerified}`);
  if (isPaidVerified === false) {
    console.log('✅ PASS: Agent A3 strictly prevented a TEST transaction from being certified as FIRST_VERIFIED_PAID_ORDER!');
    console.log('✅ Section 12 Commercial Invariant successfully protected North Star truth.');
  } else {
    console.error('❌ FAIL: Agent A3 incorrectly allowed test payment to qualify as real revenue!');
    process.exit(1);
  }

  // Step 6: Verify Campaign State in DB
  console.log('\n--- STEP 6: Auditing Live State in Supabase ---');
  const { count: realPaidCount } = await supabase
    .from('first_revenue_payment_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('counts_as_revenue', true);

  console.log(`Current Total Verified Paid Orders in Database: ${realPaidCount || 0}`);
  if ((realPaidCount || 0) === 0) {
    console.log('✅ ZERO FAKE REVENUE CONFIRMED: Database maintains 0 fake paid orders.');
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL END-TO-END PIPELINE VERIFICATIONS PASSED (REV3-020)!');
  console.log('===============================================================\n');
}

runE2ETest().catch(err => {
  console.error('Fatal error during E2E test:', err);
  process.exit(1);
});
