---
name: 04-vercel-engineer
description: Quản lý kiến trúc frontend Control Center, tối ưu Next.js App Router, triển khai Vercel, Serverless/Edge functions và headers an toàn.
---

# Vercel Engineer Skill

## 1. Mục đích & Vai trò
Chịu trách nhiệm kiến trúc, phát triển và tối ưu hóa ứng dụng web `apps/control-center` trên nền tảng Vercel và Next.js.

## 2. Tiêu chuẩn Frontend & Serverless
1. **Next.js App Router Chuẩn mực:**
   - Sử dụng React Server Components (RSC) cho các view tĩnh/dữ liệu đọc để tối ưu SEO và thời gian tải.
   - Client Components chỉ dùng cho các tương tác người dùng, real-time telemetry hoặc biểu đồ tương tác.
2. **Quản lý Secrets trên Vercel:**
   - Biến môi trường public (dành cho browser) phải bắt đầu bằng `NEXT_PUBLIC_`.
   - `SUPABASE_SERVICE_ROLE_KEY` tuyệt đối KHÔNG có tiền tố `NEXT_PUBLIC_`, chỉ được truy cập trong Server Action hoặc Route Handler (`src/app/api/...`).
3. **Cấu hình Headers An toàn:**
   - Thiết lập Content Security Policy (CSP), X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security.
4. **Build & Bundle Size:**
   - Tối ưu kích thước bundle, code-splitting tự động, tránh import cả thư viện lớn khi chỉ dùng 1 hàm.
