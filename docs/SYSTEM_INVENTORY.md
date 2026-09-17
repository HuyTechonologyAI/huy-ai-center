# SYSTEM INVENTORY — HUY TECHNOLOGY AI ECOSYSTEM

Tài liệu kiểm kê toàn diện hiện trạng 3 website thuộc Hệ sinh thái HUY TECHNOLOGY AI.  
Kiểm tra thực hiện ở chế độ: **READ-ONLY** (Không can thiệp, không sửa đổi mã nguồn hoặc cơ sở dữ liệu).

---

## 1. Bảng Kiểm kê Hệ thống (System Inventory Matrix)

| Application | Domain | Repository | Vercel | Supabase | Auth | Database | Storage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Huy AI Portfolio (EdTech AI)** | `https://www.huycncdsai.io.vn/` | `HuyTechonologyAI/edtech-ai-portfolio` | Deployed (Project slug: NOT VERIFIED via CLI/Dashboard) | Project Ref: `bdeluacbzbdflxubhpha` | Cookie-based session (`admin_session` + `ADMIN_PASSWORD`) | Supabase PostgreSQL (17+ bảng nghiệp vụ) | Proxy URL signed HMAC-SHA256, LocalStorage tracking. Supabase Bucket: NONE | **Active Production** |
| **Smart Teacher Schedule (EduViet AI)** | `https://www.gvcncdsai.io.vn/` | `HuyTechonologyAI/SmartTeacherScheduleAI` (Thư mục `/landingpage`) | Deployed (Project slug: NOT VERIFIED via CLI/Dashboard) | Project Ref: `kdpouzqjowbuxtfrqsds` | Cookie-based RBAC (`smart_auth_role` qua Edge Middleware) | Supabase PostgreSQL (5 bảng nghiệp vụ) | Client-side IndexedDB (`idb-keyval`), PPTX/XLSX export. Supabase Bucket: NONE | **Active Production** |
| **SmartTax AI (Tax & Accounting AI)** | `https://smarttax-ai.vercel.app/` | `hoalong08012019/smarttax-ai` | Deployed (Project slug: `smarttax-ai`) | Project Ref: `zdfutrckmadorhrmzsaz` | JWT Multi-tenant (thiết kế ánh xạ `auth.users.id`) | Supabase PostgreSQL + `pgvector` extension | Local OCR / In-memory pipeline. Supabase Bucket: NOT VERIFIED | **Active Production** |

---

## 2. Chi tiết kỹ thuật từng ứng dụng

### 2.1. Huy AI Portfolio (`huycncdsai.io.vn`)
- **Vai trò hiện tại:** Cổng thông tin chính (Master Hub), cung cấp kho tài nguyên và API AI Hub chuyển tiếp sơ khai.
- **Framework & Runtime:**
  - Next.js: `16.2.5` (App Router)
  - React: `19.2.4`
  - Styling: Tailwind CSS `v4` (`@tailwindcss/postcss`)
  - Runtime: Node.js 20+ (Môi trường kiểm tra cục bộ: Node v24.15.0)
- **Cấu hình Vercel:**
  - Triển khai dạng Next.js Serverless Functions trên Vercel.
  - Sử dụng header bảo mật và streaming route.
- **Cấu hình Supabase:**
  - Host: `bdeluacbzbdflxubhpha.supabase.co`
  - Thư viện: `@supabase/supabase-js` `^2.105.3`
  - Bảng sử dụng: `resources`, `resource_views`, `videos`, `contacts`, `leads`, `student_points_balance`, `daily_tasks`, `task_completions`, `user_document_progress`, `user_video_progress`, `knowledge_chunks`, `item_reviews`, `audit_logs`, `comments`, `folders`, `orders`, `transactions`.
- **Cơ chế xác thực (Authentication):**
  - Không sử dụng Supabase GoTrue Auth.
  - Quản trị viên đăng nhập qua `/api/admin/login` bằng `ADMIN_PASSWORD`. Thiết lập cookie HTTP-only `admin_session=authenticated` (thời hạn 7 ngày, kèm rate-limit chống brute force 5 lần / 15 phút).
- **Danh sách biến môi trường (Chỉ ghi nhận tên biến, KHÔNG lưu secret):**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `ADMIN_PASSWORD`
  - `SIGNED_URL_SECRET`
  - `NEXT_PUBLIC_BANK_ID`
  - `NEXT_PUBLIC_BANK_NAME`
  - `NEXT_PUBLIC_BANK_BRANCH`
  - `NEXT_PUBLIC_ACCOUNT_NO`
  - `NEXT_PUBLIC_ACCOUNT_NAME`
  - `NEXT_PUBLIC_HOTLINE`
  - `NEXT_PUBLIC_EMAIL`

---

### 2.2. Smart Teacher Schedule (`gvcncdsai.io.vn`)
- **Vai trò hiện tại:** Nền tảng thời khóa biểu thông minh, giáo án và quản lý nghiệp vụ giáo viên EduViet AI.
- **Framework & Runtime:**
  - Next.js: `16.2.5` (App Router trong thư mục `/landingpage`)
  - React: `19.2.4`
  - Styling: Tailwind CSS `v4`
  - Thư viện hỗ trợ: `pptxgenjs` (4.0.1), `xlsx` (0.18.5), `canvas-confetti`, `idb-keyval`, `jszip`.
- **Cấu hình Vercel:**
  - File cấu hình: `landingpage/vercel.json` (framework: nextjs, build: next build, install: npm install).
- **Cấu hình Supabase:**
  - Host: `kdpouzqjowbuxtfrqsds.supabase.co`
  - Thư viện: `@supabase/supabase-js` `^2.105.3`
  - Bảng sử dụng: `teacher_sync_stores`, `vouchers`, `support_requests`, `subscription_orders`, `download_events`.
- **Cơ chế xác thực (Authentication):**
  - Không sử dụng Supabase GoTrue Auth.
  - Phân quyền theo vai trò thông qua Cookie `smart_auth_role` (`GUEST`, `STUDENT`, `PARENT`, `PRINCIPAL`, `SUPER_ADMIN`), được kiểm soát tại Edge bởi file `landingpage/middleware.ts`.
- **Danh sách biến môi trường (Chỉ ghi nhận tên biến, KHÔNG lưu secret):**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SYNC_GIST_ID`
  - `SYNC_GITHUB_TOKEN`

---

### 2.3. SmartTax AI (`smarttax-ai.vercel.app`)
- **Vai trò hiện tại:** Ứng dụng SaaS kế toán, hóa đơn và rà soát rủi ro thuế thông minh bằng AI.
- **Framework & Runtime:**
  - Frontend: Vite `^8.0.12` + React `19.2.6` (SPA)
  - Backend: Python FastAPI (`backend/main.py`, `pydantic-settings`)
- **Cấu hình Vercel:**
  - File cấu hình: `vercel.json` định tuyến SPA rewrite: `{"source": "/(.*)", "destination": "/index.html"}`.
- **Cấu hình Supabase:**
  - Host: `zdfutrckmadorhrmzsaz.supabase.co`
  - Extensions: `vector` (`pgvector` cho tìm kiếm ngữ nghĩa văn bản pháp luật).
  - Bảng sử dụng: `tenants`, `users`, `invoices`, `journals`, `tax_declarations`, `legal_knowledge`, `audit_logs`.
- **Cơ chế xác thực (Authentication):**
  - Thiết kế xác thực JWT đa người dùng (Multi-tenant) với vai trò `OWNER`, `ACCOUNTANT`, `ADMIN`. Khóa ngoại `users.id` dự kiến ánh xạ với `auth.users.id` của Supabase Auth.
- **Danh sách biến môi trường (Chỉ ghi nhận tên biến, KHÔNG lưu secret):**
  - `SECRET_KEY`
  - `ALGORITHM`
  - `ACCESS_TOKEN_EXPIRE_MINUTES`
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `DATABASE_URL`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`
  - `OPENAI_API_KEY`
  - `GEMINI_API_KEY`

---

## 3. Bản đồ liên kết chéo và phụ thuộc (Cross-Site Links & Dependencies)

### 3.1. Liên kết giao diện người dùng (UI Cross-links)
1. **Từ `edtech-ai-portfolio`:**
   - Header bar, Footer và tab Hệ sinh thái liên kết trực tiếp tới `https://gvcncdsai.io.vn` và `https://smarttax-ai.vercel.app`.
2. **Từ `SmartTeacherSchedule`:**
   - Header, Footer, trang ứng dụng `/app` và `TeacherAuthModal` có nút chuyển hướng và trích dẫn bản quyền về `https://huycncdsai.io.vn`.
3. **Từ `smarttax-ai`:**
   - Thanh điều hướng bên trái (Sidebar) tích hợp 2 liên kết đối tác: "EduViet AI" (`https://gvcncdsai.io.vn`) và "Huy Technology AI Hub" (`https://huycncdsai.io.vn`).

### 3.2. Phụ thuộc API trực tiếp (Direct API Dependencies)
1. **Đồng bộ tài nguyên giữa `gvcncdsai.io.vn` và `huycncdsai.io.vn`:**
   - Endpoint `https://www.gvcncdsai.io.vn/api/ecosystem/resources` thực hiện gọi HTTP `GET` và `POST` trực tiếp tới `https://www.huycncdsai.io.vn/api/resources` để đọc danh sách tài liệu và đồng bộ tài liệu chống trùng lặp.
2. **CORS Whitelist trên `huycncdsai.io.vn`:**
   - Endpoint `src/app/api/ai/hub/route.ts` trên `edtech-ai-portfolio` đã cấu hình CORS cho phép `https://gvcncdsai.io.vn` và `https://smarttax-ai.vercel.app`.
