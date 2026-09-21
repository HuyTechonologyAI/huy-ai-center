# BÁO CÁO KIỂM THỬ KHÓI SẢN XUẤT (V2 PRODUCTION SMOKE REPORT)

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Tên miền kiểm tra:** `https://www.huycncdsai.io.vn`  
**Công cụ kiểm thử:** Puppeteer Core trên Google Chrome Stable (Windows 11)  
**Thời gian thực thi:** 2026-09-21T22:24:08+07:00  

---

## 1. DANH SÁCH CÁC HẠNG MỤC KIỂM TRA

| STT | Tuyến đường / Thành phần | Kết quả mong đợi | Kết quả thực tế | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `GET /` (Trang chủ Root) | HTTP 200, hiển thị Corporate V2 Header/Hero | HTTP 200, Title chuẩn, CSS Tailwind V2 đầy đủ | **PASS** |
| 2 | `GET /v2` (Đường dẫn Preview cũ) | Redirect HTTP 307 về `/` | Chuyển hướng ngay lập tức về `https://www.huycncdsai.io.vn/` | **PASS** |
| 3 | `GET /archive/home-v1` | HTTP 200, hiển thị trang chủ cá nhân cũ V1 | HTTP 200, cấu trúc trang chủ cũ nguyên vẹn | **PASS** |
| 4 | `GET /pricing` (Tuyến di sản) | HTTP 200, giữ nguyên khung shell cũ | HTTP 200, Legacy header/footer giữ nguyên | **PASS** |
| 5 | `GET /roadmap` (Tuyến di sản) | HTTP 200, giữ nguyên khung shell cũ | HTTP 200, không bị ảnh hưởng | **PASS** |
| 6 | Form Liên hệ (`#contact`) | Submit qua Server Action không phơi API key | Input validation hợp lệ, submit an toàn | **PASS** |
| 7 | Floating Controls (Zalo, Phone) | Ghim cố định góc dưới, nhấp mở đúng link | Hiển thị đúng góc phải bên dưới, click mở Zalo | **PASS** |
| 8 | Console Browser Logs | 0 Lỗi nghiêm trọng / uncaught exception | `Console Errors encountered: 0` | **PASS** |

---

## 2. MINH CHỨNG ẢNH CHỤP SẢN XUẤT THỰC TẾ

Toàn bộ ảnh chụp màn hình được lưu trữ tại:
`scratch/edtech-ai-portfolio/public/screenshots-v2-production/` và thư mục docs:

1. `01-prod-home-1440.png`: Toàn bộ trang chủ độ phân giải Desktop 1440px (4.1 MB).
2. `02-prod-home-1280.png`: Toàn bộ trang chủ độ phân giải Laptop 1280px (4.0 MB).
3. `03-prod-tablet-768.png`: Toàn bộ trang chủ độ phân giải Tablet 768px (4.2 MB).
4. `04-prod-mobile-390.png`: Toàn bộ trang chủ độ phân giải Mobile iPhone 390px (6.4 MB).
5. `05-prod-hero.png`: Vùng tiêu điểm Hero Banner sản xuất (392 KB).
6. `06-prod-ecosystem-desktop.png`: Bản đồ Hệ sinh thái 6 Business Units (706 KB).
7. `07-prod-security.png`: Phân hệ An toàn, Bảo mật và Giám sát AI (165 KB).
8. `08-prod-founder.png`: Phân hệ Hồ sơ Nhà sáng lập & Uy tín Lãnh đạo (675 KB).
9. `09-prod-archive-v1.png`: Trang lưu trữ di sản V1 `/archive/home-v1` (1.9 MB).
10. `10-prod-footer.png`: Chân trang đa thực thể 6 Business Units (171 KB).
