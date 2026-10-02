import { NextResponse } from 'next/server';
import { SocialPublishingService } from '@/lib/social-service';

export async function GET() {
  const capabilities = SocialPublishingService.getCapabilities();
  return NextResponse.json(capabilities);
}
