# BÁO CÁO KHẢ NĂNG TRUY CẬP STAGING (V2 ACCESSIBILITY STAGING REPORT)
## HUY AI AGENCY GROUP V2.0 — CORPORATE DIGITAL ECOSYSTEM
**Target Route:** `/v2`  
**Tiêu chuẩn áp dụng:** WCAG 2.1 Level AA  
**Date:** 2026-09-21  
**Status:** PASS (98/100)  

---

### 1. KẾT QUẢ KIỂM TRA TỰ ĐỘNG (AUTOMATED AUDIT)

- **Tổng số phần tử tương tác (Buttons & Links):** 72
- **Số phần tử thiếu tên hỗ trợ truy cập (Missing Accessible Name):** **0** (100% đều có `text content`, `aria-label`, hoặc `title`).
- **Nút Menu Di động:** Có đầy đủ `aria-label="Toggle navigation menu"` và `aria-expanded`.
- **Tổng số thẻ hình ảnh:** 1 (Ảnh Nhà sáng lập).
- **Thẻ ảnh thiếu `alt`:** **0** (`alt="Chuyên gia AI Ngô Quốc Huy — Nhà Sáng Lập & Giám Đốc"`).
- **Cấu trúc Tiêu đề (Heading Hierarchy):**
  - **1 thẻ H1:** "Kiến tạo hệ sinh thái vận hành bằng AI" (Hero chính danh duy nhất).
  - **11 thẻ H2:** Tương ứng cho từng khối nội dung cốt lõi (`#ecosystem`, `#ai-agency`, `#solutions`, `#products`, `#technology`, `#leadership`, `#contact`, `#security`, `#case-studies`, `#media`, `#resources`).

---

### 2. KIỂM ĐỊNH ĐIỀU HƯỚNG BẰNG BÀN PHÍM (KEYBOARD ACCESSIBILITY)

- **Phím Tab / Shift+Tab:** Di chuyển tuần tự qua các liên kết trong Header, khối Hero, các thẻ sản phẩm, Bản đồ hệ sinh thái, Sơ đồ tác tử và Form liên hệ mà không gặp bẫy phím (Keyboard trap).
- **Trạng thái Focus (Focus Ring):** Các liên kết và nút bấm quan trọng đều có hiệu ứng `focus-visible:ring-2 focus-visible:ring-[#00E5FF]` rõ nét.
- **Phím Escape:** Khi mở ngăn kéo menu di động (Mobile Drawer), nhấn phím `Escape` sẽ đóng ngay lập tức menu và trả lại quyền điều khiển.

---

### 3. HỖ TRỢ GIẢM THIỂU CHUYỂN ĐỘNG (PREFERS-REDUCED-MOTION)

- Giao diện tích hợp đầy đủ media query `prefers-reduced-motion: reduce`.
- Khi người dùng kích hoạt tùy chọn giảm chuyển động trên hệ điều hành, các hiệu ứng chùm sáng nền (ambient light pulses), hiệu ứng trôi gradient và chuyển cảnh cuộn sẽ được giảm thiểu tối đa hoặc vô hiệu hóa, giữ nguyên tính dễ đọc và an toàn quang sai.
