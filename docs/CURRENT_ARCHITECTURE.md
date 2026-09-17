# CURRENT ARCHITECTURE — HUY TECHNOLOGY AI ECOSYSTEM

Tài liệu phân tích chi tiết Kiến trúc hiện tại của Hệ sinh thái HUY TECHNOLOGY AI trước khi tích hợp Trung tâm Điều phối `huy-ai-center`.

---

## 1. Sơ đồ kiến trúc hiện tại (Current Architectural Diagram)

```mermaid
flowchart TD
    subgraph Clients["Người dùng & Trình duyệt"]
        U1["Giáo viên / Học sinh"]
        U2["Doanh nghiệp / Kế toán"]
        U3["Khách truy cập AI Hub"]
    end

    subgraph Site1["huycncdsai.io.vn (EdTech Portfolio)"]
        FE1["Next.js 16 (App Router)"]
        API1["Next.js Route Handlers"]
        ProtoHub["Sơ khai AI Hub Gateway\n(/api/ai/hub)"]
        Auth1["Cookie admin_session\n(ADMIN_PASSWORD)"]
    end

    subgraph Site2["gvcncdsai.io.vn (Smart Teacher)"]
        FE2["Next.js 16 (landingpage)"]
        API2["Next.js Route Handlers"]
        SyncRoute["/api/ecosystem/resources"]
        Auth2["Cookie smart_auth_role\n(Edge Middleware RBAC)"]
    end

    subgraph Site3["smarttax-ai.vercel.app (SmartTax AI)"]
        FE3["Vite + React 19 (SPA)"]
        PyBack["FastAPI Backend (Python)"]
        Auth3["JWT Multi-tenant"]
    end

    subgraph SupaInstances["Các phiên bản Supabase Độc lập (Siloed Projects)"]
        DB1[("Supabase #1\nbdeluacbzbdflxubhpha\n(Resources, Points, Leads)")]
        DB2[("Supabase #2\nkdpouzqjowbuxtfrqsds\n(Teacher Stores, Vouchers)")]
        DB3[("Supabase #3\nzdfutrckmadorhrmzsaz\n(Tenants, Invoices, pgvector)")]
    end

    U3 --> FE1
    FE1 --> API1
    API1 --> DB1
    API1 --> ProtoHub

    U1 --> FE2
    FE2 --> API2
    API2 --> DB2
    SyncRoute -.->|HTTP Sync Gọi trực tiếp| API1

    U2 --> FE3
    FE3 --> PyBack
    PyBack --> DB3
```

---

## 2. Đặc điểm cấu trúc hiện tại

### 2.1. Phân tán dữ liệu thành 3 Database riêng biệt (Siloed Databases)
- **Supabase Instance 1 (`bdeluacbzbdflxubhpha.supabase.co`):**
  - Đóng vai trò lưu trữ danh mục tài liệu đào tạo AI, nhật ký học tập, danh sách khách hàng liên hệ (leads) và tích điểm học sinh cho `huycncdsai.io.vn`.
- **Supabase Instance 2 (`kdpouzqjowbuxtfrqsds.supabase.co`):**
  - Chuyên phục vụ lưu trữ đồng bộ lịch dạy của giáo viên (`teacher_sync_stores`), mã giảm giá khóa học (`vouchers`) và yêu cầu hỗ trợ người dùng cho `gvcncdsai.io.vn`.
- **Supabase Instance 3 (`zdfutrckmadorhrmzsaz.supabase.co`):**
  - Chuyên phục vụ kế toán thuế đa doanh nghiệp (`tenants`, `invoices`, `journals`) và tìm kiếm văn bản luật bằng vector (`pgvector`) cho `smarttax-ai.vercel.app`.

> [!NOTE]
> 3 website hoàn toàn **không chia sẻ một cơ sở dữ liệu chung**. Mỗi website trỏ tới một dự án Supabase độc lập với các schema hoàn toàn khác nhau.

---

### 2.2. Cơ chế Xác thực phân mảnh (Fragmented Authentication)
- **Không có Single Sign-On (SSO):**
  - `huycncdsai.io.vn` xác thực quản trị bằng một mật khẩu cố định (`ADMIN_PASSWORD`) lưu trong cookie `admin_session`.
  - `gvcncdsai.io.vn` phân quyền nghiệp vụ trường học/giáo viên bằng cookie vai trò `smart_auth_role`.
  - `smarttax-ai.vercel.app` sử dụng token JWT riêng biệt giữa frontend React và FastAPI backend.
- **Hệ quả:** Người dùng khi di chuyển giữa 3 website qua thanh menu hệ sinh thái phải đăng nhập lại riêng lẻ.

---

### 2.3. Luồng AI và Phụ thuộc API sơ khai
- Trên `edtech-ai-portfolio`, đã xuất hiện một endpoint prototype `/api/ai/hub` nhằm điều phối model AI (Gemini, Groq, local fallback). Tuy nhiên:
  - Code AI này chạy trực tiếp trên Serverless Functions của Vercel (bị giới hạn thời gian timeout tối đa của Vercel: 10-60 giây).
  - Không có hàng đợi tác vụ (Queue), nếu gọi các mô hình lớn hoặc xử lý dữ liệu nặng thì request sẽ bị nghẽn (blocking) hoặc gặp lỗi timeout.
  - Phụ thuộc giữa `gvcncdsai.io.vn` và `huycncdsai.io.vn` hiện đang gọi trực tiếp qua HTTP fetch đồng bộ tại route `/api/ecosystem/resources`. Nếu `huycncdsai.io.vn` bảo trì hoặc nghẽn mạng, luồng đồng bộ này sẽ bị ảnh hưởng.
