import { NextResponse } from 'next/server';
import { SocialPublishingService } from '@/lib/social-service';

export async function GET() {
  const health = SocialPublishingService.getHealth();
  return NextResponse.json(health);
}
