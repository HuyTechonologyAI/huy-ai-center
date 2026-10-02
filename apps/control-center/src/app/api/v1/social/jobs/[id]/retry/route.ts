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

  const result = await SocialPublishingService.retryJob(id);
  if (!result.success) {
    return NextResponse.json({ error: 'RETRY_REJECTED', message: result.message }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    job_id: id,
    status: result.status,
    message: result.message
  });
}
