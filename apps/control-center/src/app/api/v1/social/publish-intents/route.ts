import { NextRequest, NextResponse } from 'next/server';
import { SocialPublishingService } from '@/lib/social-service';
import { verifyHmacSignature, SocialPublishIntentRequest } from '@huy-ai/contracts';

const GATEWAY_HMAC_SECRET = process.env.NOTE01_HMAC_SECRET || 'huy-ai-note01-secure-gateway-secret-2026';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: SocialPublishIntentRequest;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON_BODY' }, { status: 400 });
    }

    // HMAC Signature Verification if signature header is provided
    const signature = req.headers.get('x-huy-signature');
    const timestampStr = req.headers.get('x-huy-timestamp');
    const nonce = req.headers.get('x-huy-nonce');

    if (signature && timestampStr && nonce) {
      const timestamp = parseInt(timestampStr, 10);
      const verification = verifyHmacSignature(rawBody, GATEWAY_HMAC_SECRET, signature, timestamp, nonce);
      if (!verification.valid) {
        return NextResponse.json(
          { error: 'HMAC_VERIFICATION_FAILED', details: verification.error },
          { status: 401 }
        );
      }
    }

    // Validation
    if (!body.target_platforms || !Array.isArray(body.target_platforms) || body.target_platforms.length === 0) {
      return NextResponse.json({ error: 'target_platforms must be a non-empty array' }, { status: 400 });
    }

    // Enforce Vietnamese Legal Compliance & AI Transparency Check
    const capabilities = SocialPublishingService.getCapabilities();
    const requiredTags = capabilities.ai_transparency_labels.required_tags;

    for (const platform of body.target_platforms) {
      const content = body.contents?.[platform] || body.contents?.['default'];
      if (content) {
        // Enforce AI Transparency Label
        if (content.ai_label_applied === false) {
          return NextResponse.json(
            {
              error: 'LEGAL_VIOLATION_AI_TRANSPARENCY_REQUIRED',
              message: 'Chỉ thị pháp lý & Thầy Ngô Quốc Huy yêu cầu 100% bài đăng phải gắn nhãn do AI làm.'
            },
            { status: 422 }
          );
        }
        // Auto-append tags if not present
        if (!content.tags) content.tags = [];
        for (const t of requiredTags) {
          if (!content.tags.includes(t)) content.tags.push(t);
        }
      }
    }

    const result = await SocialPublishingService.createPublishIntent(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'INTERNAL_GATEWAY_ERROR', message: error.message }, { status: 500 });
  }
}

export async function GET() {
  const recent = SocialPublishingService.listRecentIntents();
  return NextResponse.json({ intents: recent });
}
