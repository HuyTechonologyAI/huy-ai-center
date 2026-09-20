# PHASE 06H — PRODUCTION PRE-MIGRATION SNAPSHOT

**Dự án:** Supabase `HuyAI`  
**Project Ref:** `bdeluacbzbdflxubhpha`  
**Region:** Singapore (`ap-southeast-1`)  
**Kiến trúc:** HUY TECHNOLOGY AI CENTER V1.2 / HAIP 1.0  
**Thời điểm ghi nhận:** 2026-09-20T21:52:00+07:00  
**Phương thức xác thực:** Trực tiếp qua Supabase Service Role Client  
**Trạng thái DDL trước khi chạy:** ZERO (Chưa áp dụng bất kỳ migration AI Center nào)  

---

## 1. Toàn Bộ 19 Bảng Hiện Hữu & Kiểm Kê Dòng Thực Tế (Live Row Counts)

| STT | Tên Bảng (public schema) | Row Count Thực Tế | Hiện Trạng RLS | Đánh Giá Ranh Giới Nghiệp Vụ |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `contacts` | **0** | ENABLED | CRM liên hệ — Touch Zero |
| 2 | `videos` | **1** | ENABLED | Danh mục video bài giảng — Touch Zero |
| 3 | `resources` | **1** | ENABLED | Học liệu EdTech — Touch Zero |
| 4 | `resource_views` | **31** | ENABLED | Bộ đếm lượt xem tài liệu — Touch Zero |
| 5 | `premium_contents` | **0** | ENABLED | Nội dung khóa học — Touch Zero |
| 6 | `item_reviews` | **0** | ENABLED | Đánh giá sao — Touch Zero |
| 7 | `audit_logs` | **0** | ENABLED | Log nghiệp vụ user/admin — Touch Zero (Zero DDL) |
| 8 | `user_activity_metrics` | **20** | ENABLED | Đo lường tương tác web — Touch Zero |
| 9 | `student_points_balance` | **3** | ENABLED | Điểm thưởng gamification học viên — Touch Zero |
| 10 | `daily_tasks` | **0** | ENABLED | Nhiệm vụ học sinh hàng ngày — Touch Zero |
| 11 | `task_completions` | **0** | ENABLED | Lịch sử hoàn thành học tập — Touch Zero |
| 12 | `cms_folders` | **2** | ENABLED | Cây thư mục CMS — Touch Zero |
| 13 | `orders` | **177** | ENABLED | Đơn hàng khóa học VietQR ACB — **TOUCH ZERO (Không dùng cho AI usage)** |
| 14 | `cms_settings` | **3** | ENABLED (No policies) | Cấu hình giao diện CMS — Touch Zero |
| 15 | `knowledge_chunks` | **0** | ENABLED | Phân mảnh vector RAG — Touch Zero |
| 16 | `user_video_progress` | **0** | ENABLED (No policies) | Tiến độ xem video học viên — Touch Zero |
| 17 | `user_document_progress` | **0** | ENABLED (No policies) | Tiến độ đọc tài liệu học viên — Touch Zero |
| 18 | `leads` | **0** | ENABLED (No policies) | Khách hàng tiềm năng — Touch Zero |
| 19 | `site_content` | **1** | ENABLED | Nội dung website động — Touch Zero |

**TỔNG SỐ DÒNG HIỆN HỮU:** **239 dòng** (Bảo toàn 100%, không mất mát, không thay đổi).

---

## 2. Tiện Ích Mở Rộng & Hàng Đợi Hiện Trạng (Extensions & Queues)

- **`pgvector`:** Đã cài đặt phiên bản `0.8.0`, đang phục vụ bảng `knowledge_chunks`.
- **`pgmq`:** Khả dụng phiên bản `1.5.1` trong hệ thống (`pg_available_extensions`), **chưa cài đặt** trong schema.
- **Hàng đợi `ai-jobs`:** Chưa tồn tại.
- **Lịch sử migration:** Chưa có bản ghi di chuyển nào của AI Center.

---

## 3. Cảnh Báo An Ninh Hiện Hữu (Known Legacy Security Findings)

*Lưu ý: Đây là hiện trạng kế thừa (Legacy Baseline), không thuộc phạm vi sửa đổi trong Phase 06H.*

1. **4 bảng bật RLS nhưng thiếu Policies:**
   - `public.cms_settings`
   - `public.leads`
   - `public.user_document_progress`
   - `public.user_video_progress`
   *(Hành vi mặc định: Chặn toàn bộ truy cập client, chỉ cho phép service_role).*
2. **Cảnh báo Mutable Search Path:**
   - Hàm `public.match_knowledge_chunks` thiếu chỉ định `SET search_path = public, pg_temp;`.
3. **Cảnh báo Auth Leaked-Password:**
   - Cảnh báo mặc định của Supabase Auth đối với tính năng kiểm tra rò rỉ mật khẩu pwned passwords.

---

## 4. Cảnh Báo Hiệu Năng Hiện Hữu (Known Legacy Performance Findings)

1. **Unindexed foreign keys:** Một số khóa ngoại trên các bảng cũ thiếu covering indexes.
2. **RLS Init-Plan:** Một số policies cũ thực hiện sub-select lặp lại mỗi dòng thay vì dạng cố định.
3. **Multiple permissive policies on `knowledge_chunks`:** Nhiều chính sách cho phép cùng lúc trên bảng vector.

---

## 5. Cam Kết An Toàn Trước Khi Áp Dụng DDL

- Không thực hiện bất kỳ lệnh `DELETE`, `TRUNCATE`, `DROP TABLE`.
- Không can thiệp hoặc sửa đổi bảng `orders` (177 rows) và `audit_logs`.
- Không chỉnh sửa các chính sách RLS cũ.
- Chỉ tạo mới chính xác **15 bảng** và kích hoạt extension `pgmq`.
- Duy nhất 1 seed được cho phép: `huy-ai-node-01` trong bảng `nodes`.
