import crypto from 'node:crypto';

/**
 * Recursively canonicalizes an arbitrary JSON-compatible value by:
 * - Sorting all object keys recursively
 * - Preserving array order
 * - Preserving primitive scalar values (strings, numbers, booleans, null)
 * - Rejecting non-JSON input instead of silently losing signed properties
 */
export function canonicalizeJson(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    if (val !== null && !['string', 'number', 'boolean'].includes(typeof val)) {
      throw new TypeError('Canonical hash requires JSON values');
    }
    if (typeof val === 'number' && !Number.isFinite(val)) {
      throw new TypeError('Canonical hash requires finite numbers');
    }
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    return '[' + Array.from(val, item => canonicalizeJson(item)).join(',') + ']';
  }

  if (Object.getPrototypeOf(val) !== Object.prototype && Object.getPrototypeOf(val) !== null) {
    throw new TypeError('Canonical hash requires plain JSON objects');
  }

  const obj = val as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries: string[] = [];

  for (const k of keys) {
    entries.push(`${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  }

  return '{' + entries.join(',') + '}';
}

/**
 * Computes deterministic SHA-256 hash from canonical recursive JSON serialization.
 */
export function canonicalSha256(val: unknown): string {
  const canonicalString = canonicalizeJson(val);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}
