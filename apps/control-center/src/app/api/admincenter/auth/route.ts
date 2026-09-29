import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

interface StoredAuth {
  username: string;
  salt: string;
  hash: string;
  isInitialDefault: boolean;
  updatedAt: string;
}

const AUTH_FILE_PATH = join(process.cwd(), "src", "data", "admincenter-auth.json");
const DEFAULT_USERNAME = "SuperAdmin";
const INITIAL_DEFAULT_PASSWORD = "admin2026";

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(password + salt + "huy-ai-center-salt-2026").digest("hex");
}

function getStoredAuth(): StoredAuth | null {
  try {
    if (existsSync(AUTH_FILE_PATH)) {
      const data = readFileSync(AUTH_FILE_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading auth file:", err);
  }
  return null;
}

function saveStoredAuth(auth: StoredAuth) {
  try {
    const dir = join(process.cwd(), "src", "data");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(AUTH_FILE_PATH, JSON.stringify(auth, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving auth file:", err);
  }
}

// GET /api/admincenter/auth - Check current session
export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admincenter_session")?.value;
  const mustChangeCookie = cookieStore.get("admincenter_must_change")?.value;

  if (sessionCookie === "authenticated") {
    return NextResponse.json({
      authenticated: true,
      user: DEFAULT_USERNAME,
      mustChangePassword: mustChangeCookie === "true",
    });
  }

  return NextResponse.json({
    authenticated: false,
    user: null,
    mustChangePassword: false,
  });
}

// POST /api/admincenter/auth - Login / Change Password / Logout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "login";
    const cookieStore = await cookies();

    // 1. LOGOUT ACTION
    if (action === "logout") {
      const response = NextResponse.json({ success: true, message: "Đăng xuất thành công" });
      response.cookies.set("admincenter_session", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
      });
      response.cookies.set("admincenter_must_change", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
      });
      return response;
    }

    // 2. CHANGE PASSWORD ACTION
    if (action === "change_password") {
      const { currentPassword, newPassword } = body;

      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: "Mật khẩu mới phải có tối thiểu 8 ký tự bao gồm chữ và số" },
          { status: 400 }
        );
      }

      const stored = getStoredAuth();
      let isCurrentValid = false;

      if (stored && !stored.isInitialDefault) {
        const verifyHash = hashPassword(currentPassword, stored.salt);
        isCurrentValid = verifyHash === stored.hash;
      } else {
        // Initial setup validation
        isCurrentValid = currentPassword === INITIAL_DEFAULT_PASSWORD;
      }

      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Mật khẩu hiện tại không chính xác" },
          { status: 400 }
        );
      }

      // Generate new salt and hash
      const newSalt = randomBytes(16).toString("hex");
      const newHash = hashPassword(newPassword, newSalt);

      const updatedAuth: StoredAuth = {
        username: DEFAULT_USERNAME,
        salt: newSalt,
        hash: newHash,
        isInitialDefault: false,
        updatedAt: new Date().toISOString(),
      };

      saveStoredAuth(updatedAuth);

      const response = NextResponse.json({
        success: true,
        message: "Thiết lập mật khẩu mới thành công! Hệ thống đã ghi nhận.",
        mustChangePassword: false,
      });

      // Update cookies
      response.cookies.set("admincenter_session", "authenticated", {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      response.cookies.set("admincenter_must_change", "false", {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return response;
    }

    // 3. LOGIN ACTION
    if (action === "login") {
      const { username, password } = body;

      if (!username || !password) {
        return NextResponse.json(
          { error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu" },
          { status: 400 }
        );
      }

      if (username.trim().toLowerCase() !== DEFAULT_USERNAME.toLowerCase()) {
        return NextResponse.json(
          { error: "Tên đăng nhập không hợp lệ" },
          { status: 401 }
        );
      }

      const stored = getStoredAuth();
      let isValid = false;
      let mustChange = false;

      if (stored && !stored.isInitialDefault) {
        const inputHash = hashPassword(password, stored.salt);
        isValid = inputHash === stored.hash;
        mustChange = false;
      } else {
        // Fallback or Initial state
        if (password === INITIAL_DEFAULT_PASSWORD) {
          isValid = true;
          mustChange = true;
        }
      }

      if (!isValid) {
        return NextResponse.json(
          { error: "Mật khẩu không chính xác" },
          { status: 401 }
        );
      }

      const response = NextResponse.json({
        success: true,
        message: "Đăng nhập thành công!",
        user: DEFAULT_USERNAME,
        mustChangePassword: mustChange,
      });

      response.cookies.set("admincenter_session", "authenticated", {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      response.cookies.set("admincenter_must_change", mustChange ? "true" : "false", {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return response;
    }

    return NextResponse.json({ error: "Thao tác không được hỗ trợ" }, { status: 400 });
  } catch (err: any) {
    console.error("Auth endpoint error:", err);
    return NextResponse.json(
      { error: "Lỗi xử lý xác thực: " + (err.message || "Unknown") },
      { status: 500 }
    );
  }
}
