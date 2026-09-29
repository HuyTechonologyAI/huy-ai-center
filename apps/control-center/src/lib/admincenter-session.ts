import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AdminSession {
  username: string;
  expiresAt: number;
}

export function adminSessionSecret(): string {
  const secret =
    process.env.ADMINCENTER_SESSION_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("ADMINCENTER_SESSION_SECRET_UNAVAILABLE");
  }
  return secret;
}

export function signAdminSession(
  username: string,
  secret: string,
  nowMs = Date.now(),
  ttlMs = SESSION_TTL_MS,
): string {
  if (!username || !secret || ttlMs <= 0) throw new Error("SESSION_INPUT_INVALID");
  const expiresAt = nowMs + ttlMs;
  const payload = `${username}.${expiresAt}`;
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifyAdminSession(
  token: string | undefined,
  secret: string,
  nowMs = Date.now(),
): AdminSession | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [username, expiresText, suppliedMac] = parts;
  const expiresAt = Number(expiresText);
  if (!username || !Number.isSafeInteger(expiresAt) || expiresAt <= nowMs) return null;

  const payload = `${username}.${expiresAt}`;
  const expectedMac = createHmac("sha256", secret).update(payload).digest("base64url");
  const supplied = Buffer.from(suppliedMac);
  const expected = Buffer.from(expectedMac);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  return { username, expiresAt };
}