# BÁO CÁO CHUYỂN TIẾP SEO SẢN XUẤT (V2 PRODUCTION SEO REPORT)

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Domain:** `https://www.huycncdsai.io.vn`  
**Ngày phát hành:** 2026-09-21  

---

## 1. THÔNG SỐ SIÊU DỮ LIỆU & INDEXABILITY

### Thẻ Tiêu đề (Title Tag)
```html
<title>HUY TECHNOLOGY AI GROUP | Hệ sinh thái AI Agency &amp; Tự động hóa</title>
```
*Đánh giá:* Ngắn gọn, nêu bật tên thương hiệu tập đoàn và các năng lực cốt lõi.

### Thẻ Mô tả (Meta Description)
```html
<meta name="description" content="Hệ sinh thái công nghệ kết nối các giải pháp AI, Tự động hóa, Giáo dục số, Pháp lý thuế và Truyền thông chuyên biệt trên nền tảng điều phối đa tác tử an toàn theo chuẩn HAIP/1.0."/>
```
*Đánh giá:* Khái quát đầy đủ 6 mảng hoạt động và kiến trúc chuẩn hóa HAIP/1.0.

### Thẻ Canonical
```html
<link rel="canonical" href="https://www.huycncdsai.io.vn"/>
```
*Đánh giá:* Đảm bảo không trùng lặp nội dung giữa các biến thể URL.

### Thẻ Robots & Indexing
```html
<meta name="robots" content="index, follow"/>
```
*HTTP Header:*
- `X-Robots-Tag: noindex`: **Đã tắt hoàn toàn trên Production** (chỉ kích hoạt ở Vercel preview environments).
- `sitemap.xml`: Trỏ về domain sản xuất chuẩn `https://www.huycncdsai.io.vn`.
- `robots.txt`: Khai báo sitemap và cho phép các công cụ tìm kiếm cào dữ liệu công khai.

---

## 2. CHIẾN LƯỢC ĐIỀU HƯỚNG & LƯU TRỮ LIÊN KẾT

1. **Tuyến `/v2` (Giai đoạn Preview):**
   - Đã cấu hình HTTP 307 (Server-side redirect) về `/`.
   - Tránh phân mảnh PageRank và tránh lỗi 404 cho bất kỳ ai truy cập đường dẫn xem trước cũ.
2. **Tuyến `/archive/home-v1`:**
   - Bảo toàn toàn bộ nội dung giáo dục, khoá học và hình ảnh của V1.
   - Thân thiện với người dùng và đối tác cũ cần tra cứu thông tin lịch sử.
3. **Thẻ Schema.org JSON-LD:**
   - Cập nhật định danh Tổ chức (`Organization`) với tên chính thức `Huy Technology AI Hub` / `Vạn Hỏa Long Tech`.
   - Khai báo nhà sáng lập `Ngô Quốc Huy` với đầy đủ liên kết định danh số (`gvcncdsai.io.vn`, `smarttax-ai.vercel.app`).
