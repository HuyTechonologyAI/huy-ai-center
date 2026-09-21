# BÁO CÁO AN TOÀN & BẢO MẬT SẢN XUẤT (V2 PRODUCTION SECURITY REPORT)

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Domain:** `https://www.huycncdsai.io.vn`  
**Ngày phát hành:** 2026-09-21  

---

## 1. PHÒNG VỆ THÔNG TIN VÀ KIẾN TRÚC NỘI BỘ (ZERO TOPOLOGY EXPOSURE)

1. **Không lộ bí mật hạ tầng:**
   - Hoàn toàn loại bỏ các thuật ngữ/thông số nội bộ khỏi giao diện công khai: `Dell Precision M4800`, `PGMQ`, `ai-jobs`, `bdeluacbzbdflxubhpha`, `huy-ai-node-01`, `06J-A`, v.v.
   - Thay thế bằng các khái niệm tiêu chuẩn công nghiệp: "Cụm tính toán chuyên biệt (Edge Computing Cluster)", "Hàng đợi điều phối phân tán", "Giao thức HAIP/1.0", "Trung tâm điều khiển tập trung".

2. **Quản trị Khóa Bí mật & API Keys:**
   - Không có `SUPABASE_SERVICE_ROLE_KEY` hoặc private keys nào được nhúng vào client bundle.
   - Các API endpoints nhạy cảm đều được bảo vệ bởi middleware xác thực và phân quyền nghiêm ngặt.

3. **Luồng Tiếp nhận Liên hệ An toàn (Contact Form Security):**
   - Form liên hệ sử dụng Next.js Server Action (`submitContact`), thực thi 100% phía server.
   - Dữ liệu được xác thực định dạng trước khi ghi vào bảng `contacts`/`leads` bằng RLS và ràng buộc bảo mật.

4. **Kiểm tra Header HTTP An toàn:**
   - `Strict-Transport-Security`: `max-age=63072000` (Bắt buộc HTTPS 2 năm).
   - `X-Frame-Options`: `SAMEORIGIN` (Chống tấn công Clickjacking).
   - `X-Content-Type-Options`: `nosniff` (Chống tấn công MIME sniffing).
   - `Referrer-Policy`: `strict-origin-when-cross-origin`.
   - `Permissions-Policy`: `camera=(), microphone=(self), geolocation=()`.
