/**
 * HUY AI CENTER — 5-PLANE SOCIAL PUBLISHING CONTRACTS & INTERFACES
 * Architecture: Control Plane, Orchestration Plane, Media Plane, Credential Plane, Provider Plane
 * Standards: OpenAPI 3.1, HMAC-SHA256, Zero-Secret Exposure, Idempotency Guard
 */

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'linkedin'
  | 'x'
  | 'tiktok'
  | 'youtube';

export type SocialScheduleType = 'IMMEDIATE' | 'SCHEDULED';

export type SocialPublishStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'PUBLISHED'
  | 'PARTIAL_SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'ROLLED_BACK';

export type SocialJobStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'MEDIA_PREPARING'
  | 'POSTING'
  | 'RECONCILING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED'
  | 'ROLLED_BACK';

export type SocialPostMode = 'DEFAULT' | 'UPLOAD_DRAFT' | 'DIRECT_POST';

export interface VietnameseLegalCompliance {
  cybersecurity_law_2018: boolean;
  pdp_law_91_2025: boolean;
  nd_356_2025: boolean;
  nd_330_2026: boolean;
  edu_cv_5512: boolean;
  edu_tt_22: boolean;
}

export interface SocialMediaAssetInput {
  media_type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  original_url: string;
  aspect_ratio?: '1:1' | '4:5' | '16:9' | '9:16';
  mime_type: string;
}

export interface SocialContentItemInput {
  platform: SocialPlatform;
  title?: string;
  body: string;
  tags?: string[];
  ai_label_applied?: boolean;
  media_assets?: SocialMediaAssetInput[];
}

export interface SocialPublishIntentRequest {
  campaign_id?: string;
  target_platforms: SocialPlatform[];
  schedule_type?: SocialScheduleType;
  scheduled_for?: string; // ISO 8601
  contents: Record<string, SocialContentItemInput>; // keyed by platform or generic
  created_by?: string;
}

export interface SocialPublishIntentResponse {
  intent_id: string;
  campaign_id: string;
  status: SocialPublishStatus;
  total_jobs: number;
  job_ids: string[];
  created_at: string;
}

export interface SocialJobDetail {
  id: string;
  intent_id: string;
  content_id: string;
  platform: SocialPlatform;
  account_ref: string;
  idempotency_key: string;
  status: SocialJobStatus;
  post_mode: SocialPostMode;
  provider_post_id?: string;
  provider_url?: string;
  error_code?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialJobGroupResponse {
  intent_id: string;
  status: SocialPublishStatus;
  total_jobs: number;
  successful_jobs: number;
  failed_jobs: number;
  jobs: SocialJobDetail[];
}

export interface SocialCapabilitiesResponse {
  supported_platforms: Record<
    SocialPlatform,
    {
      display_name: string;
      supported_media: ('IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'CAROUSEL' | 'DOCUMENT')[];
      aspect_ratios: string[];
      max_video_duration_sec: number;
      default_post_mode: SocialPostMode;
      direct_post_requires_human_gate: boolean;
      rate_limits: {
        max_posts_per_day: number;
        golden_hours_gmt7: string[];
      };
    }
  >;
  vietnamese_legal_standard: VietnameseLegalCompliance;
  ai_transparency_labels: {
    header: string;
    footer: string;
    required_tags: string[];
  };
}

export interface Note01GatewayHealth {
  plane: 'CONTROL_PLANE';
  node_id: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  uptime_seconds: number;
  planes_status: {
    control_plane: 'UP' | 'DOWN';
    orchestration_plane_n8n: 'UP' | 'DOWN' | 'UNREACHABLE';
    media_compute_plane: 'UP' | 'DOWN' | 'UNREACHABLE';
    credential_plane_vault: 'UP' | 'DOWN';
    database_plane: 'UP' | 'DOWN';
  };
}

/**
 * Builds deterministic idempotency key for social publishing jobs.
 * Format: {content_id}:{revision}:{platform}:{account_ref}
 */
export function buildSocialIdempotencyKey(
  contentId: string,
  revision: number,
  platform: SocialPlatform,
  accountRef: string
): string {
  return `${contentId}:${revision}:${platform}:${accountRef}`;
}
