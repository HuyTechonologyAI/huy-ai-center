/**
 * LOG REDACTOR — Secrets and credential scrubber
 * Phase: AI-DEV-BRIDGE-A
 *
 * Redacts sensitive values from any string before it is stored
 * in audit logs, plans, or execution summaries.
 */

// ─────────────────────────────────────────────────
// Redaction patterns (key patterns whose values are scrubbed)
// ─────────────────────────────────────────────────

const VALUE_KEY_PATTERNS: RegExp[] = [
  /\b([A-Z_]*_KEY)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b([A-Z_]*_TOKEN)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b([A-Z_]*_SECRET)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b([A-Z_]*_PASSWORD)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b(DATABASE_URL)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b(SUPABASE_SERVICE_ROLE_KEY)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b(SUPABASE_ANON_KEY)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b(OPENAI_API_KEY)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b(GOOGLE_API_KEY)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b(GITHUB_TOKEN)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b(CLOUDFLARE_[A-Z_]+)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
  /\b(NEXT_PUBLIC_SUPABASE_[A-Z_]+)\s*([:=])\s*["']?([^\s"']+)["']?/gi,
];

// Bearer token patterns in headers/URLs
const BEARER_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g, // Standard JWT
  /sk-[A-Za-z0-9]{20,}/g, // OpenAI keys
  /ghp_[A-Za-z0-9]{36}/g, // GitHub PAT
  /ghs_[A-Za-z0-9]{36}/g, // GitHub app token
];

const REDACTED = "[REDACTED]";

// ─────────────────────────────────────────────────
// Core redaction function
// ─────────────────────────────────────────────────

/**
 * Redacts sensitive values from a string.
 * Designed to be called before any log write.
 */
export function redact(input: string): string {
  let output = input;

  // Redact key=value pairs — scrub the value after the key pattern
  for (const pattern of VALUE_KEY_PATTERNS) {
    output = output.replace(
      new RegExp(pattern.source, pattern.flags),
      (_match, key, delim) => `${key}${delim}${REDACTED}`
    );
  }

  // Redact bearer tokens and raw keys
  for (const pattern of BEARER_PATTERNS) {
    output = output.replace(pattern, REDACTED);
  }

  return output;
}

/**
 * Redact all values from a record/object (shallow).
 * Useful for scrubbing environment-like objects.
 */
export function redactObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      result[key] = REDACTED;
    } else if (typeof value === "string") {
      result[key] = redact(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Returns true if a key name suggests it holds a sensitive value.
 */
export function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  return (
    upper.endsWith("_KEY") ||
    upper.endsWith("_TOKEN") ||
    upper.endsWith("_SECRET") ||
    upper.endsWith("_PASSWORD") ||
    upper === "DATABASE_URL" ||
    upper.startsWith("CLOUDFLARE_") ||
    upper.startsWith("SUPABASE_SERVICE_ROLE") ||
    upper === "GITHUB_TOKEN" ||
    upper === "OPENAI_API_KEY" ||
    upper === "GOOGLE_API_KEY"
  );
}

/**
 * Safe JSON serializer that redacts sensitive fields.
 */
export function safeJsonStringify(
  data: unknown,
  indent = 2
): string {
  try {
    return JSON.stringify(data, (_key, value) => {
      if (typeof value === "string") {
        return redact(value);
      }
      return value;
    }, indent);
  } catch {
    return JSON.stringify({ error: "Serialization failed" });
  }
}
