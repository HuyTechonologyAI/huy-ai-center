import { NextRequest, NextResponse } from 'next/server';
import { SocialPublishingService } from '@/lib/social-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
  }

  const result = await SocialPublishingService.cancelJob(id);
  if (!result.success) {
    return NextResponse.json({ error: 'CANCEL_FAILED', message: result.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: result.message });
}
