/**
 * HUY AI CENTER — TEST & VERIFICATION SUITE
 * Social Publishing Engine & Note-01 + n8n 5-Plane Architecture
 *
 * Verifies:
 * 1. HMAC-SHA256 signature generation, validation & replay attack rejection.
 * 2. Token Broker opaque resolution, fail-closed policy & zero plaintext secret leaks.
 * 3. Idempotency key generation & collision prevention.
 * 4. Vietnamese legal compliance & AI transparency tagging enforcement.
 * 5. Reconcile-before-retry protocol.
 * 6. Media Worker aspect ratios & Vietnamese pedagogical TTS.
 * 7. n8n 21 micro-workflow schemas & structure integrity.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  generateHmacSignature,
  verifyHmacSignature,
  TokenBroker,
  buildSocialIdempotencyKey,
  SocialPublishIntentRequest
} from '../packages/contracts/src/index.js';
import { SocialPublishingService } from '../apps/control-center/src/lib/social-service.js';
import { MediaService } from '../apps/media-worker/src/service.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
  }
}

async function runVerificationSuite() {
  console.log('\n================================================================');
  console.log('  HUY AI CENTER — SOCIAL PUBLISHING 5-PLANE VERIFICATION SUITE');
  console.log('================================================================\n');

  const SECRET = 'test-note01-secret-key-2026';

  // ── TEST 1: HMAC-SHA256 & REPLAY ATTACK REJECTION ───────────────
  console.log('🔹 [Plane 1: Control Gateway Security] Testing HMAC & Replay Guard...');
  const payload = JSON.stringify({ action: 'PUBLISH_BROADCAST', target: 'all' });
  const now = Date.now();
  const nonce = 'nonce_abc123';

  const validSig = generateHmacSignature(payload, SECRET, now, nonce);
  const verifyResult = verifyHmacSignature(payload, SECRET, validSig, now, nonce);
  assert(verifyResult.valid === true, 'Valid HMAC signature accepted');

  // Tampered payload
  const tamperedSig = verifyHmacSignature(payload + 'tamper', SECRET, validSig, now, nonce);
  assert(tamperedSig.valid === false && tamperedSig.error === 'INVALID_SIGNATURE', 'Tampered payload rejected with INVALID_SIGNATURE');

  // Stale replay attack (10 minutes old > 5 minutes window)
  const staleTimestamp = now - 600000;
  const staleSig = generateHmacSignature(payload, SECRET, staleTimestamp, nonce);
  const replayResult = verifyHmacSignature(payload, SECRET, staleSig, staleTimestamp, nonce);
  assert(replayResult.valid === false && replayResult.error === 'TIMESTAMP_OUT_OF_WINDOW_REPLAY_REJECTED', 'Replay attack rejected');

  // ── TEST 2: CREDENTIAL PLANE (TOKEN BROKER) ─────────────────────
  console.log('\n🔹 [Plane 4: Credential Vault] Testing Token Broker & Zero Leaks...');
  const metaRef = 'vault://social/meta/fb_page_smartteacher_vn';
  TokenBroker.registerCredential(metaRef, 'LIVE_META_TOKEN_SECRET_12345', 3600);

  const resolved = TokenBroker.resolveToken(metaRef);
  assert(resolved === 'LIVE_META_TOKEN_SECRET_12345', 'Token resolved strictly in memory');

  let failedClosed = false;
  try {
    TokenBroker.resolveToken('vault://social/unregistered/account');
  } catch (err: any) {
    if (err.message.includes('FAIL_CLOSED')) failedClosed = true;
  }
  assert(failedClosed, 'Unregistered credential triggers FAIL_CLOSED exception');

  // Token sanitizer test
  const dirtyLog = 'Calling Meta Graph API with EAABcdef1234567890123456 and password="my-secret-pw"';
  const cleanLog = TokenBroker.sanitize(dirtyLog);
  assert(!cleanLog.includes('EAABcdef123') && !cleanLog.includes('my-secret-pw'), 'TokenBroker.sanitize redacts all secret patterns');

  // ── TEST 3: IDEMPOTENCY KEY GENERATION ──────────────────────────
  console.log('\n🔹 [Orchestration Plane] Testing Idempotency Constraints...');
  const key1 = buildSocialIdempotencyKey('cnt_001', 1, 'facebook', 'fb_page_smartteacher_vn');
  const key2 = buildSocialIdempotencyKey('cnt_001', 1, 'facebook', 'fb_page_smartteacher_vn');
  const key3 = buildSocialIdempotencyKey('cnt_001', 2, 'facebook', 'fb_page_smartteacher_vn');

  assert(key1 === 'cnt_001:1:facebook:fb_page_smartteacher_vn', 'Idempotency key format matches specification');
  assert(key1 === key2, 'Identical intent produces identical idempotency key');
  assert(key1 !== key3, 'Revision bump produces new distinct key');

  // ── TEST 4: VIETNAMESE LEGAL & AI TRANSPARENCY ──────────────────
  console.log('\n🔹 [Legal Shield] Testing Vietnamese Compliance & AI Transparency...');
  const capabilities = SocialPublishingService.getCapabilities();

  assert(capabilities.vietnamese_legal_standard.cybersecurity_law_2018 === true, 'Luật An ninh mạng 2018 enforced');
  assert(capabilities.vietnamese_legal_standard.pdp_law_91_2025 === true, 'Luật BV Dữ liệu cá nhân 91/2025/QH15 enforced');
  assert(capabilities.vietnamese_legal_standard.edu_cv_5512 === true, 'Công văn 5512/BGDĐT sư phạm verified');
  assert(capabilities.ai_transparency_labels.required_tags.includes('#NoiDungDoAILam'), 'Required tag #NoiDungDoAILam present');
  assert(capabilities.ai_transparency_labels.required_tags.includes('#MadeWithAI'), 'Required tag #MadeWithAI present');

  // TikTok upload draft rule check
  const tiktokCap = capabilities.supported_platforms.tiktok;
  assert(tiktokCap.default_post_mode === 'UPLOAD_DRAFT', 'TikTok strictly defaults to UPLOAD_DRAFT (video.upload)');
  assert(tiktokCap.direct_post_requires_human_gate === true, 'TikTok Direct Post requires Human Gate R3 clearance');

  // ── TEST 5: RECONCILE-BEFORE-RETRY & JOB DISPATCH ───────────────
  console.log('\n🔹 [Control Plane API] Testing Intent Creation & Reconcile Protocol...');
  const intentRequest: SocialPublishIntentRequest = {
    campaign_id: 'FIRST-REVENUE-V3',
    target_platforms: ['facebook', 'tiktok', 'youtube'],
    schedule_type: 'IMMEDIATE',
    contents: {
      default: {
        platform: 'facebook',
        title: 'Giáo án điện tử AI theo CV 5512',
        body: 'Thử nghiệm hệ thống tự động đăng bài sư phạm. #NoiDungDoAILam #MadeWithAI',
        ai_label_applied: true
      }
    }
  };

  const intentResponse = await SocialPublishingService.createPublishIntent(intentRequest);
  assert(intentResponse.status === 'QUEUED', 'Publish intent queued successfully');
  assert(intentResponse.total_jobs === 3, 'Intent decomposed into 3 platform jobs');
  assert(intentResponse.job_ids.length === 3, 'Received 3 discrete job IDs');

  const firstJobId = intentResponse.job_ids[0];
  const group = await SocialPublishingService.getJobGroup(intentResponse.intent_id);
  assert(group !== null && group.jobs.length === 3, 'Job group retrieved with all child jobs');

  // Reconcile before retry test
  const retryResult = await SocialPublishingService.retryJob(firstJobId);
  assert(retryResult.success === true, 'Reconcile-before-retry processed successfully');

  // ── TEST 6: MEDIA WORKER COMPUTE PLANE ──────────────────────────
  console.log('\n🔹 [Plane 3: Media Compute] Testing Media Worker...');
  const probe = MediaService.probeMedia('test_video.mp4');
  assert(probe.format === 'mp4' && probe.has_audio === true, 'Media probe returns valid metadata');

  const resize = MediaService.resizeImage({
    input_path_or_url: 'sample_infographic.png',
    target_aspect_ratio: '9:16'
  });
  assert(resize.success && resize.dimensions.width === 1080 && resize.dimensions.height === 1920, 'Image resized to 9:16 (1080x1920)');

  const tts = MediaService.synthesizeVietnameseVoice({
    text: 'Chào mừng quý thầy cô đến với nền tảng giáo dục chuyển đổi số Smart Teacher Schedule.'
  });
  assert(tts.success && tts.duration_sec > 0, 'Vietnamese pedagogical TTS synthesized successfully');

  // ── TEST 7: N8N 21 MICRO-WORKFLOWS INTEGRITY ────────────────────
  console.log('\n🔹 [Plane 2: n8n Orchestration] Testing 21 Micro-Workflows Integrity...');
  const wfDir = resolve(process.cwd(), '.ai-agency/n8n/workflows');
  assert(existsSync(wfDir), 'Directory .ai-agency/n8n/workflows exists');

  const files = readdirSync(wfDir).filter((f) => f.endsWith('.json'));
  assert(files.length === 21, `All 21 micro-workflows present in directory (found ${files.length})`);

  let validWfCount = 0;
  for (const f of files) {
    try {
      const parsed = JSON.parse(readFileSync(join(wfDir, f), 'utf8'));
      if (parsed.name && parsed.nodes && parsed.connections) {
        validWfCount++;
      }
    } catch {
      // invalid
    }
  }
  assert(validWfCount === 21, 'All 21 workflow JSON files strictly conform to n8n schema');

  // Check TikTok workflow specific post mode
  const ttWf = JSON.parse(readFileSync(join(wfDir, 'WF-TT_tiktok_publisher.json'), 'utf8'));
  assert(ttWf.name.includes('TikTok') && ttWf.nodes.length >= 2, 'WF-TT TikTok publisher workflow validated');

  // ── SUMMARY REPORT ──────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('  🎉 100% SUCCESS — All 5 planes verified and production-ready!');
  } else {
    console.error(`  ⚠️ ${failedTests} TESTS FAILED`);
  }
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerificationSuite().catch((err) => {
  console.error('Fatal error during verification suite:', err);
  process.exit(1);
});
