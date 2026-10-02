import { createHmac } from 'node:crypto';

/**
 * Generates an HMAC-SHA256 signature for cross-plane requests (Note-01 Gateway <-> n8n <-> Media Worker).
 * Canonical string format: `${timestamp}:${nonce}:${payload}`
 */
export function generateHmacSignature(
  payload: string,
  secret: string,
  timestamp: number,
  nonce: string
): string {
  const message = `${timestamp}:${nonce}:${payload}`;
  return createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Verifies an HMAC-SHA256 signature and validates replay window (default 5 minutes).
 */
export function verifyHmacSignature(
  payload: string,
  secret: string,
  signature: string,
  timestamp: number,
  nonce: string,
  maxWindowMs = 300000
): { valid: boolean; error?: string } {
  const now = Date.now();
  if (Math.abs(now - timestamp) > maxWindowMs) {
    return { valid: false, error: 'TIMESTAMP_OUT_OF_WINDOW_REPLAY_REJECTED' };
  }

  const expectedSignature = generateHmacSignature(payload, secret, timestamp, nonce);
  if (signature !== expectedSignature) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }

  return { valid: true };
}

/**
 * Token Broker: Resolves opaque credential references (vault://social/...)
 * Strictly in-memory resolution. NEVER exposes tokens to logs, prompts, or serialized JSON.
 */
export class TokenBroker {
  private static tokenStore: Map<string, { token: string; expiresAt: number }> = new Map();

  /**
   * Registers a token in the secure in-memory broker cache
   */
  public static registerCredential(ref: string, token: string, ttlSeconds = 86400): void {
    if (!ref.startsWith('vault://')) {
      throw new Error('Credential ref must follow vault:// URI format');
    }
    this.tokenStore.set(ref, {
      token,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  /**
   * Retrieves live active token strictly for ephemeral API calls.
   * Throws if expired or missing, triggering fail-closed protocol.
   */
  public static resolveToken(ref: string): string {
    const entry = this.tokenStore.get(ref);
    if (!entry) {
      // Fallback check environment variable mapped from ref: vault://social/facebook/fb_01 -> SOCIAL_TOKEN_FACEBOOK_FB_01
      const envKey = ref.replace('vault://social/', 'SOCIAL_TOKEN_').replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
      const envVal = process.env[envKey];
      if (envVal) {
        return envVal;
      }
      throw new Error(`FAIL_CLOSED: Credential reference '${ref}' not resolved in Token Broker`);
    }

    if (Date.now() > entry.expiresAt) {
      throw new Error(`FAIL_CLOSED: Credential reference '${ref}' has expired. Renewal required.`);
    }

    return entry.token;
  }

  /**
   * Redacts any credential or token patterns from logs and strings
   */
  public static sanitize(text: string): string {
    return text
      .replace(/EA[A-Za-z0-9]{20,}/g, '[REDACTED_META_TOKEN]')
      .replace(/ghp_[A-Za-z0-9]{30,}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_BEARER_TOKEN]')
      .replace(/(password|secret|key|token)["']?\s*[:=]\s*["']?([^"',\s]+)/gi, '$1="[REDACTED]"');
  }
}
