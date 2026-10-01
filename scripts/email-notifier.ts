/**
 * HUMAN OWNER EMAIL NOTIFIER & ESCALATION GATE
 * Uses Resend API to deliver high-priority alerts, human gate authorizations,
 * and order verification notifications directly to Thầy Ngô Quốc Huy.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Load RESEND_API_KEY from environment or .env.local
let RESEND_API_KEY = process.env.RESEND_API_KEY || '';
if (!RESEND_API_KEY) {
  // Check local .env files
  const possiblePaths = [
    resolve(process.cwd(), '../edtech-ai-portfolio/.env.local'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env')
  ];
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      const match = readFileSync(p, 'utf-8').match(/RESEND_API_KEY=([^\r\n]+)/);
      if (match && match[1]) {
        RESEND_API_KEY = match[1].trim();
        break;
      }
    }
  }
}

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'huytechnologyai2025@gmail.com';
const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export interface EmailPayload {
  subject: string;
  title: string;
  category: 'HUMAN_GATE_R3_R4' | 'ORDER_VERIFIED' | 'CRITICAL_EXCEPTION' | 'SYSTEM_ACTIVATED';
  details: Record<string, string>;
  actionRequired?: string;
}

export async function sendOwnerEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  const detailRows = Object.entries(payload.details)
    .map(([k, v]) => `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">${k}</td><td style="padding: 8px; border: 1px solid #ddd;">${v}</td></tr>`)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
      <div style="background: #1e3a8a; color: white; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 18px;">HUY TECHNOLOGY AI AGENCY GROUP V3.0</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Chỉ thị & Báo cáo Ngoại lệ từ Antigravity L1 Supervisor</p>
      </div>

      <h3 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">${payload.title}</h3>
      <p><b>Phân loại:</b> <span style="background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${payload.category}</span></p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        ${detailRows}
      </table>

      ${payload.actionRequired ? `
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 6px 0; color: #b45309;">HÀNH ĐỘNG CẦN THẦY PHÊ DUYỆT / CHỈ THỊ:</h4>
        <p style="margin: 0; font-size: 14px;">${payload.actionRequired}</p>
      </div>` : ''}

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666; margin: 0;">Email tự động gửi từ Antigravity L1 Group Supervisor tới Thầy Ngô Quốc Huy (huytechnologyai2025@gmail.com). Hệ thống vận hành tự động 24/7 theo mô hình Human-on-Exception.</p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: OWNER_EMAIL,
        subject: `[HUY AI GROUP] ${payload.subject}`,
        html
      })
    });

    const data = await res.json() as any;
    if (res.ok && data.id) {
      console.log(`[EmailNotifier] ✅ Email delivered to ${OWNER_EMAIL}. ID: ${data.id}`);
      return { success: true, id: data.id };
    } else {
      console.error(`[EmailNotifier] ❌ Resend error:`, data);
      return { success: false, error: JSON.stringify(data) };
    }
  } catch (err: any) {
    console.error(`[EmailNotifier] ❌ Network error:`, err);
    return { success: false, error: err.message };
  }
}
