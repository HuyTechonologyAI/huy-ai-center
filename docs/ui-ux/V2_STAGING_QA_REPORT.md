# BÁO CÁO KIỂM THỬ CHẤT LƯỢNG STAGING (V2 STAGING QA REPORT)
## HUY AI AGENCY GROUP V2.0 — CORPORATE DIGITAL ECOSYSTEM
**Target Route:** `/v2`  
**Preview Deployment:** `https://edtech-ai-portfolio-azmg886h4-huytechonologyais-projects.vercel.app/v2`  
**Feature Branch:** `feature/06j-ux-b-corporate-v2-preview` (Commit `6c0fa2f`)  
**Base Branch:** `main` (Untouched)  
**Date:** 2026-09-21  
**Status:** PASS  

---

### 1. MA TRẬN TƯƠNG THÍCH MÀN HÌNH (RESPONSIVE MATRIX)

| Viewport | Thiết bị đại diện | Tràn ngang (Horizontal Overflow) | Bố cục thẻ & Grid | Sticky Header | Mobile Menu / Floating UI | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **390 x 844** | iPhone 12/13/14 | False (Không tràn) | 1 cột, thẻ thu gọn | Dính chuẩn, anchor offset | Menu mở mượt, ẩn floating | **PASS** |
| **430 x 932** | iPhone 14/15 Pro Max | False (Không tràn) | 1 cột, typography chuẩn | Dính chuẩn | Menu mở mượt, ẩn floating | **PASS** |
| **768 x 1024** | iPad Mini / Portrait | False (Không tràn) | 2 cột linh hoạt | Dính chuẩn | Header desktop/tablet | **PASS** |
| **1024 x 768** | iPad Landscape | False (Không tràn) | 2-3 cột | Dính chuẩn | Desktop nav hiển thị | **PASS** |
| **1280 x 800** | MacBook Air 13" / Laptop | False (Không tràn) | 3 cột chuẩn | Dính chuẩn | Desktop nav đầy đủ | **PASS** |
| **1366 x 768** | HD Laptop Display | False (Không tràn) | 3 cột chuẩn | Dính chuẩn | Desktop nav đầy đủ | **PASS** |
| **1440 x 900** | Desktop tiêu chuẩn | False (Không tràn) | 3 cột tỷ lệ vàng | Dính chuẩn | Desktop nav đầy đủ | **PASS** |
| **1920 x 1080** | Full HD Desktop | False (Không tràn) | Căn giữa max-w-7xl | Dính chuẩn | Desktop nav đầy đủ | **PASS** |

---

### 2. TƯƠNG THÍCH TRÌNH DUYỆT (CROSS-BROWSER MATRIX)

- **Google Chrome / Chromium:** PASS (Hiển thị hoàn hảo, không lỗi layout, không xung đột CSS Turbopack).
- **Microsoft Edge (Blink):** PASS (Kiểm thử thực tế với `msedge.exe`, tiêu đề và nội dung render chuẩn xác 100%).
- **Trình duyệt di động giả lập (WebKit / Mobile Chrome):** PASS (Hỗ trợ tốt Safe-area insets và Touch gestures).

---

### 3. KIỂM SOÁT RUNTIME & LỖI MẠNG (CONSOLE & NETWORK AUDIT)

- **Uncaught Exceptions trên `/v2`:** 0
- **React Hydration Errors:** 0
- **React Key Warnings:** 0
- **Tài nguyên mạng bị lỗi (404 Resources):** 0
- **Service Worker:** Kích hoạt hợp lệ (`PWA ServiceWorker registered with scope: http://localhost:3000/`)
- **Tuyến không tồn tại:** Trả về mã lỗi chuẩn `404 Not Found` qua trang 404 mặc định an toàn.

---

### 4. TƯƠNG TÁC NGƯỜI DÙNG & BIỂU MẪU (INTERACTIVE UX AUDIT)

1. **Biểu mẫu Liên hệ (`#contact`):**
   - Hoạt động ở chế độ **Staging / Preview Mode (Chỉ xác thực dữ liệu)**.
   - Hỗ trợ đầy đủ chọn nhu cầu (Automation / Consulting / Training), nhập thông tin hợp lệ.
   - Trạng thái thành công hiển thị mượt mà sau 800ms.
   - **Tuyệt đối không gửi bản ghi giả vào hệ thống CRM hay Database Production**.
2. **Nút Zalo & Hành động Nổi:**
   - Hoạt động ổn định ở góc dưới phải.
   - Tự động ẩn khi Drawer Menu di động mở để tránh bấm nhầm.
   - Tuân thủ khoảng cách an toàn `env(safe-area-inset-bottom)`.
3. **Thanh Menu Di động (Mobile Drawer):**
   - Nút Hamburger mở ra menu toàn màn hình với nền mờ cao cấp (`backdrop-blur-2xl`).
   - Tự động khóa cuộn trang (`document.body.style.overflow = 'hidden'`).
   - Đóng mượt mà khi bấm X, chọn link điều hướng hoặc nhấn phím Escape.
