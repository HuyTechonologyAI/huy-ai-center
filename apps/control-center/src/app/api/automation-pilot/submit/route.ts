import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getServerAdminSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      company,
      role,
      email,
      phone,
      problem,
      current_tools,
      preferred_contact_time,
      consent,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      landing_session_id,
      honeypot
    } = body;

    // 1. Bot check via honeypot
    if (honeypot) {
      console.warn('[Ingress] Honeypot triggered, rejecting bot submission.');
      return NextResponse.json({ success: false, error: 'Invalid submission' }, { status: 400 });
    }

    // 2. Validate mandatory fields (Section 18)
    if (!name || !company || !email || !phone || !problem) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng điền đầy đủ các thông tin bắt buộc: Họ tên, Doanh nghiệp, Email, Số điện thoại và Quy trình cần tự động hóa.' },
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        { success: false, error: 'Quý khách vui lòng đồng ý nhận tư vấn và bảo mật thông tin để tiếp tục.' },
        { status: 400 }
      );
    }

    const supabase = getServerAdminSupabase();
    const rawPayload = JSON.stringify(body);
    const contentHash = createHash('sha256').update(rawPayload).digest('hex');

    // 3. Write-First: Insert Lead into canonical first_revenue_leads table
    const { data: leadData, error: leadError } = await supabase
      .from('first_revenue_leads')
      .insert({
        campaign_id: 'FIRST-REVENUE-V3',
        name: name.trim(),
        company: company.trim(),
        role: role ? role.trim() : null,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        problem: problem.trim(),
        current_tools: current_tools ? current_tools.trim() : null,
        preferred_contact_time: preferred_contact_time ? preferred_contact_time.trim() : null,
        utm_source: utm_source || 'google',
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        landing_session_id: landing_session_id || null,
        status: 'NEW_REAL_LEAD',
        is_test: false
      })
      .select('id')
      .single();

    if (leadError || !leadData) {
      console.error('[Ingress] Error writing lead to Supabase:', leadError);
      return NextResponse.json({ success: false, error: 'Lỗi ghi nhận dữ liệu máy chủ.' }, { status: 500 });
    }

    const leadId = leadData.id;

    // 4. Record Consent Event
    await supabase.from('first_revenue_consents').insert({
      lead_id: leadId,
      consent_flag: true,
      consent_text_version: 'v3.0-2026-10',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    });

    // 5. Record Immutable Evidence Event
    await supabase.from('first_revenue_evidence_events').insert({
      entity_id: leadId,
      entity_type: 'LEAD',
      event_type: 'NEW_REAL_LEAD_SUBMISSION',
      source: 'WEBSITE_LANDING_AUTOMATION_PILOT',
      payload: body,
      content_hash: contentHash,
      is_verified: true
    });

    // 6. Push to PGMQ / Create HAIP Task for A1 Intent AI
    try {
      await supabase.from('ai_tasks').insert({
        conversation_id: leadId,
        source_app: 'automation_pilot_ingress',
        intent: 'FIRST_REVENUE.LEAD_QUALIFICATION',
        priority: 5,
        assigned_capability: 'intent_qualification',
        status: 'QUEUED',
        risk_level: 0,
        risk_context: { lead_id: leadId, campaign_id: 'FIRST-REVENUE-V3' }
      });
    } catch (qErr) {
      console.warn('[Ingress] Warning enqueuing ai_tasks (Lead is safely stored):', qErr);
    }

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      message: 'Đăng ký thành công! Đội ngũ Kỹ sư Tự động hóa HUY AI sẽ liên hệ và chuẩn bị hồ sơ khảo sát 15 phút cho Quý doanh nghiệp.'
    });
  } catch (err: any) {
    console.error('[Ingress] Fatal error in submit route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
