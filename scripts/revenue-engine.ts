/**
 * 24/7 REVENUE OPERATING SYSTEM & FIRST-ORDER WAR ROOM ENGINE
 * Canonical Blueprint V1.0 (Sections 0 - 52)
 *
 * Single Objective: FIRST_VERIFIED_PAID_ORDER
 * Principles:
 * - Evidence-First: No source = No lead; No real reply = No conversation; No bank evidence = No PAID.
 * - Test data / Bot self-chats are tagged TEST_ONLY and excluded from revenue metrics.
 * - Primary Offer: EduViet Teacher VIP 1 Plan (39k trial / 349k year) via ACB 37780997 VietQR.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { hydrateContext, writebackCheckpoint } from './context-engine.js';

const ROOT = resolve(process.cwd());
const AGENCY_DIR = join(ROOT, '.ai-agency');

export interface RevenueLead {
  lead_id: string;
  entity_name: string;
  entity_type: 'TEACHER' | 'SCHOOL' | 'SME' | 'TRAINING_CENTER';
  source_url: string;
  source_type: 'WEBSITE_FORM' | 'ZALO_OA' | 'FACEBOOK' | 'DIRECT';
  contact_path: string;
  need_signal: string;
  need_signal_source: string;
  confidence: number;
  status: 'DISCOVERED' | 'VERIFIED' | 'QUALIFIED' | 'CONTACTED' | 'REPLIED';
  is_test: boolean;
  verified_at?: string;
}

export interface RevenueOrder {
  order_id: string;
  lead_id: string;
  customer_name: string;
  offer_id: string;
  offer_name: string;
  agreed_price: number;
  currency: 'VND';
  status: 'PENDING' | 'PAID' | 'FAILED';
  payment_reference?: string;
  bank_account?: string;
  payment_verified_at?: string;
  is_test: boolean;
}

export class RevenueEngine {
  private agencyDir: string;

  constructor(agencyDir: string) {
    this.agencyDir = agencyDir;
  }

  // 1. Audit and Enforce Revenue Truth Policy
  public auditRevenueState() {
    console.log(`\n================================================================`);
    console.log(`🎯 [REVENUE-WAR-ROOM] 24/7 Revenue Audit & Pipeline Evaluation`);
    console.log(`⭐ North Star: FIRST_VERIFIED_PAID_ORDER (Target: 1)`);
    console.log(`================================================================`);

    // Hydrate context to prevent forgetting/drift
    const ctx = hydrateContext(this.agencyDir);
    if (!ctx.valid) {
      throw new Error(`[RevenueEngine] Stale context! Aborting revenue cycle: ${ctx.staleFiles.join(', ')}`);
    }

    const statePath = join(this.agencyDir, 'state', 'REVENUE_STATE.json');
    const revenueState = JSON.parse(readFileSync(statePath, 'utf-8'));

    const warRoomPath = join(this.agencyDir, 'state', 'FIRST_ORDER_STATE.json');
    const warRoomState = JSON.parse(readFileSync(warRoomPath, 'utf-8'));

    console.log(`[REVENUE-WAR-ROOM] Mode: ${revenueState.mode}`);
    console.log(`[REVENUE-WAR-ROOM] Offer: ${revenueState.first_revenue_offer}`);
    console.log(`[REVENUE-WAR-ROOM] Verified Paid Orders: ${revenueState.verified_paid_orders} / ${revenueState.target_paid_orders}`);

    // Real Commercial Evidence Check
    const evidencePath = join(this.agencyDir, 'workstreams', 'ws-04-revenue-war-room', 'EVIDENCE');
    const hasPaidEvidence = existsSync(evidencePath) && existsSync(join(evidencePath, 'BANK_RECEIPT_001.json'));

    if (!hasPaidEvidence) {
      console.log(`[REVENUE-WAR-ROOM] ℹ️ Status: NO_VERIFIED_PAYMENT_YET.`);
      console.log(`[REVENUE-WAR-ROOM] 🛡️ Anti-Hallucination Guard: Revenue remains strictly 0 VND until authentic bank transfer is confirmed.`);
      revenueState.verified_paid_orders = 0;
      revenueState.verified_revenue_vnd = 0;
      revenueState.current_bottleneck = 'AWAITING_FIRST_INBOUND_PAYMENT_CONVERSION';
    }

    revenueState.last_updated = new Date().toISOString();
    writeFileSync(statePath, JSON.stringify(revenueState, null, 2), 'utf-8');

    return {
      mode: revenueState.mode,
      verifiedPaidOrders: revenueState.verified_paid_orders,
      revenueVnd: revenueState.verified_revenue_vnd,
      bottleneck: revenueState.current_bottleneck
    };
  }

  // 2. Process Inbound Lead with Evidence Validation
  public registerLead(lead: RevenueLead): { valid: boolean; reason?: string } {
    if (lead.is_test) {
      console.log(`[REVENUE-WAR-ROOM] Lead ${lead.lead_id} tagged as TEST_ONLY. Excluded from real funnel.`);
      return { valid: false, reason: 'TEST_ONLY_FLAG' };
    }

    if (!lead.source_url || !lead.contact_path) {
      console.warn(`[REVENUE-WAR-ROOM] ❌ Rejected lead ${lead.lead_id}: Missing verifiable source or contact path.`);
      return { valid: false, reason: 'MISSING_SOURCE_EVIDENCE' };
    }

    console.log(`[REVENUE-WAR-ROOM] ✅ Verified authentic lead: ${lead.entity_name} (${lead.contact_path})`);
    return { valid: true };
  }

  // 3. Process Bank Payment Verification (ACB 37780997)
  public verifyPayment(order: RevenueOrder, bankTransactionId: string, receivedAmount: number): boolean {
    if (order.is_test) {
      console.warn(`[REVENUE-WAR-ROOM] Order ${order.order_id} is a TEST order. Payment will not count towards North Star.`);
      return false;
    }

    if (!bankTransactionId || bankTransactionId.trim() === '') {
      console.error(`[REVENUE-WAR-ROOM] ❌ Payment verification failed: Missing bankTransactionId.`);
      return false;
    }

    if (receivedAmount < order.agreed_price) {
      console.error(`[REVENUE-WAR-ROOM] ❌ Payment mismatch: Order requires ${order.agreed_price} VND, received ${receivedAmount} VND.`);
      return false;
    }

    console.log(`\n🎉🎉🎉 [REVENUE-WAR-ROOM] FIRST PAID ORDER VERIFIED! 🎉🎉🎉`);
    console.log(`Customer: ${order.customer_name} | Offer: ${order.offer_name} | Amount: ${receivedAmount} VND`);
    console.log(`Bank Tx: ${bankTransactionId} (ACB - 37780997 NGO QUOC HUY)`);

    // Record Immutable Order Evidence Snapshot
    const evidenceDir = join(this.agencyDir, 'workstreams', 'ws-04-revenue-war-room', 'EVIDENCE');
    const orderEvidence = {
      order_id: order.order_id,
      lead_id: order.lead_id,
      customer_name: order.customer_name,
      agreed_price: order.agreed_price,
      received_amount: receivedAmount,
      currency: "VND",
      bank_transaction_id: bankTransactionId,
      beneficiary: "ACB - 37780997 (NGO QUOC HUY)",
      payment_status: "VERIFIED_PAID",
      verified_at: new Date().toISOString()
    };
    writeFileSync(join(evidenceDir, `${order.order_id}_EVIDENCE.json`), JSON.stringify(orderEvidence, null, 2), 'utf-8');

    // Update States
    const statePath = join(this.agencyDir, 'state', 'REVENUE_STATE.json');
    const rState = JSON.parse(readFileSync(statePath, 'utf-8'));
    rState.verified_paid_orders += 1;
    rState.verified_revenue_vnd += receivedAmount;
    rState.mode = "REPEATABLE_REVENUE";
    rState.current_bottleneck = "FULFILLMENT_AND_EXPANSION";
    rState.last_verified_event = `PAID_ORDER_${order.order_id}`;
    rState.last_updated = new Date().toISOString();
    writeFileSync(statePath, JSON.stringify(rState, null, 2), 'utf-8');

    // Append Checkpoint
    writebackCheckpoint(this.agencyDir, 'ws-04-revenue-war-room', {
      checkpoint_id: `CHK-FIRST-ORDER-${order.order_id}`,
      parent_checkpoint_id: null,
      task_id: "REV-P0-020-FIRST-ORDER",
      stage: "FIRST_ORDER_VERIFIED_PAID",
      owner_agent: "L1_ANTIGRAVITY_SUPERVISOR",
      status: "VERIFIED",
      completed_work: [
        `First paid customer order verified: ${order.order_id}`,
        `Payment confirmed via bank transaction ${bankTransactionId}`
      ],
      evidence_refs: [`${order.order_id}_EVIDENCE.json`]
    });

    return true;
  }
}

// Self-run verification cycle
if (process.argv[1]?.endsWith('revenue-engine.ts')) {
  const engine = new RevenueEngine(AGENCY_DIR);
  engine.auditRevenueState();
}
