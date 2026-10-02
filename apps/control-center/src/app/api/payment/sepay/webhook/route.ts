import { NextRequest, NextResponse } from 'next/server';
import { getServerAdminSupabase } from '@/lib/supabase';
import { createHash } from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    // 1. SePay Payload format
    // SePay typically sends: { id, gateway, transactionDate, accountNumber, subAccount, transferType, transferAmount, accumulated, code, transactionContent, referenceCode, description }
    const {
      id: externalTxId,
      gateway,
      transferType,
      transferAmount,
      code: paymentCode,
      transactionContent,
      referenceCode
    } = payload;

    if (!externalTxId) {
      return NextResponse.json({ success: false, error: 'Missing external transaction ID' }, { status: 400 });
    }

    const supabase = getServerAdminSupabase();

    // 2. Deduplication check
    const { data: existingTx } = await supabase
      .from('first_revenue_payment_transactions')
      .select('id, is_reconciled')
      .eq('provider', 'SEPAY')
      .eq('external_transaction_id', String(externalTxId))
      .maybeSingle();

    if (existingTx) {
      console.log(`[SePay Webhook] Duplicate transaction ignored: ${externalTxId}`);
      return NextResponse.json({ success: true, message: 'Transaction already processed' });
    }

    // 3. Direction check (must be incoming transfer)
    if (transferType && transferType.toLowerCase() !== 'in') {
      console.warn(`[SePay Webhook] Non-incoming transfer ignored: ${transferType}`);
      return NextResponse.json({ success: true, message: 'Ignored outbound transfer' });
    }

    const amount = Number(transferAmount);

    // 4. Order lookup by payment code or transactionContent regex
    let matchedOrder: any = null;
    const lookupCode = paymentCode || transactionContent || referenceCode || '';

    // Search for active pending orders
    const { data: orders } = await supabase
      .from('first_revenue_orders')
      .select('*')
      .eq('status', 'PAYMENT_PENDING');

    if (orders && orders.length > 0) {
      for (const ord of orders) {
        if (lookupCode.includes(ord.order_code)) {
          matchedOrder = ord;
          break;
        }
      }
    }

    const isTest = payload.is_test || payload.test === true;
    const countsAsRevenue = !isTest && matchedOrder && amount >= Number(matchedOrder.agreed_price);

    // 5. Insert payment transaction record
    const { data: txRecord, error: txError } = await supabase
      .from('first_revenue_payment_transactions')
      .insert({
        order_id: matchedOrder ? matchedOrder.id : null,
        provider: 'SEPAY',
        external_transaction_id: String(externalTxId),
        gateway_account: gateway || 'ACB',
        transfer_type: 'in',
        transfer_amount: amount,
        payment_code: lookupCode,
        reference_code: referenceCode || null,
        raw_payload: payload,
        is_reconciled: !!matchedOrder,
        environment: isTest ? 'TEST' : 'LIVE',
        counts_as_revenue: countsAsRevenue,
        verified_at: countsAsRevenue ? new Date().toISOString() : null
      })
      .select('id')
      .single();

    if (txError) {
      console.error('[SePay Webhook] Error recording transaction:', txError);
      return NextResponse.json({ success: false, error: txError.message }, { status: 500 });
    }

    // 6. If verified authentic external payment for valid order -> Transition order to PAID_VERIFIED
    if (countsAsRevenue && matchedOrder) {
      console.log(`\n🎉 [SePay Webhook] AUTHENTIC PAYMENT VERIFIED for Order: ${matchedOrder.order_code}`);
      console.log(`Amount: ${amount} VND | External Tx: ${externalTxId}`);

      await supabase
        .from('first_revenue_orders')
        .update({
          status: 'PAID_VERIFIED',
          updated_at: new Date().toISOString()
        })
        .eq('id', matchedOrder.id);

      // Create Evidence Event
      const contentHash = createHash('sha256').update(rawBody).digest('hex');
      await supabase.from('first_revenue_evidence_events').insert({
        entity_id: matchedOrder.id,
        entity_type: 'ORDER',
        event_type: 'LIVE_PAYMENT_VERIFIED',
        source: 'SEPAY_WEBHOOK',
        payload: {
          external_tx_id: externalTxId,
          amount,
          order_code: matchedOrder.order_code
        },
        content_hash: contentHash,
        is_verified: true
      });
    }

    return NextResponse.json({
      success: true,
      transaction_id: txRecord?.id,
      reconciled: !!matchedOrder,
      counts_as_revenue: countsAsRevenue
    });
  } catch (err: any) {
    console.error('[SePay Webhook] Fatal error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
