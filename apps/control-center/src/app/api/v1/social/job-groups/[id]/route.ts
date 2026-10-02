import { NextRequest, NextResponse } from 'next/server';
import { SocialPublishingService } from '@/lib/social-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing intent ID' }, { status: 400 });
  }

  const group = await SocialPublishingService.getJobGroup(id);
  if (!group) {
    return NextResponse.json({ error: 'JOB_GROUP_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json(group);
}
