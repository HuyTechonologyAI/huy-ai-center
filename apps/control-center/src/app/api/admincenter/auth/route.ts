import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  adminSessionSecret,
  signAdminSession,
  verifyAdminSession,
} from "@/lib/admincenter-session";

export const runtime = "nodejs";

interface StoredAuth {
  username: string;
  salt: string;
  hash: string;
  isInitialDefault: boolean;
  updatedAt: string;
}

const DEFAULT_USERNAME = "SuperAdmin";
const INITIAL_DEFAULT_PASSWORD = "admin2026";
const AUTH_SETTING_KEY = "admincenter_auth";
function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

function safeHashEqual(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isStoredAuth(value: unknown): value is StoredAuth {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<StoredAuth>;
  return typeof row.username === "string" &&
    typeof row.salt === "string" &&
    typeof row.hash === "string" &&
    typeof row.isInitialDefault === "boolean" &&
    typeof row.updatedAt === "string";
}
async function getStoredAuth(): Promise<StoredAuth | null> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin");
  const { data, error } = await supabaseAdmin
    .schema("public")
    .from("cms_settings")
    .select("setting_value")
    .eq("key_name", AUTH_SETTING_KEY)
    .maybeSingle();
  if (error) throw new Error("ADMINCENTER_AUTH_READ_FAILED");
  return isStoredAuth(data?.setting_value) ? data.setting_value : null;
}

async function saveStoredAuth(auth: StoredAuth): Promise<void> {
  const { supabaseAdmin } = await import("@/lib/supabase-admin");
  const { error } = await supabaseAdmin
    .schema("public")
    .from("cms_settings")
    .upsert({
      key_name: AUTH_SETTING_KEY,
      setting_value: auth,
      updated_at: auth.updatedAt,
    }, { onConflict: "key_name" });
  if (error) throw new Error("ADMINCENTER_AUTH_WRITE_FAILED");
}
function setSessionCookie(response: NextResponse, username: string) {
  const token = signAdminSession(username, adminSessionSecret());
  response.cookies.set("admincenter_session", token, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

async function currentSession() {
  try {
    const token = (await cookies()).get("admincenter_session")?.value;
    return verifyAdminSession(token, adminSessionSecret());
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null, mustChangePassword: false });
  }
  const stored = await getStoredAuth();
  return NextResponse.json({
    authenticated: true,
    user: session.username,
    mustChangePassword: !stored || stored.isInitialDefault,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "login";

    if (action === "logout") {
      const response = NextResponse.json({ success: true, message: "Đăng xuất thành công" });
      response.cookies.set("admincenter_session", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      return response;
    }

    if (action === "change_password") {
      const session = await currentSession();
      if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      const { currentPassword, newPassword } = body;
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: "Mật khẩu mới phải có tối thiểu 8 ký tự" },
          { status: 400 },
        );
      }

      const stored = await getStoredAuth();
      const currentValid = stored
        ? safeHashEqual(hashPassword(currentPassword, stored.salt), stored.hash)
        : currentPassword === INITIAL_DEFAULT_PASSWORD;
      if (!currentValid) {
        return NextResponse.json({ error: "Mật khẩu hiện tại không chính xác" }, { status: 400 });
      }

      const salt = randomBytes(16).toString("hex");
      const updatedAuth: StoredAuth = {
        username: DEFAULT_USERNAME,
        salt,
        hash: hashPassword(newPassword, salt),
        isInitialDefault: false,
        updatedAt: new Date().toISOString(),
      };
      await saveStoredAuth(updatedAuth);
      const response = NextResponse.json({
        success: true,
        message: "Thiết lập mật khẩu mới thành công.",
        mustChangePassword: false,
      });
      setSessionCookie(response, DEFAULT_USERNAME);
      return response;
    }

    if (action === "login") {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin" }, { status: 400 });
      }
      if (username.trim().toLowerCase() !== DEFAULT_USERNAME.toLowerCase()) {
        return NextResponse.json({ error: "Tên đăng nhập không hợp lệ" }, { status: 401 });
      }

      const stored = await getStoredAuth();
      const isValid = stored
        ? safeHashEqual(hashPassword(password, stored.salt), stored.hash)
        : password === INITIAL_DEFAULT_PASSWORD;
      const mustChangePassword = !stored || stored.isInitialDefault;
      if (!isValid) {
        return NextResponse.json({ error: "Mật khẩu không chính xác" }, { status: 401 });
      }
      const response = NextResponse.json({
        success: true,
        message: "Đăng nhập thành công!",
        user: DEFAULT_USERNAME,
        mustChangePassword,
      });
      setSessionCookie(response, DEFAULT_USERNAME);
      return response;
    }

    return NextResponse.json({ error: "Thao tác không được hỗ trợ" }, { status: 400 });
  } catch (error) {
    console.error("AdminCenter auth error:", error);
    return NextResponse.json({ error: "AUTH_SERVICE_UNAVAILABLE" }, { status: 503 });
  }
}