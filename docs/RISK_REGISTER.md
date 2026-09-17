# RISK REGISTER — HUY TECHNOLOGY AI ECOSYSTEM

Bảng đăng ký và đánh giá rủi ro hệ thống kỹ thuật hiện tại và phương án phòng ngừa trong quá trình tích hợp `huy-ai-center`.

---

## 1. Ma trận Rủi ro Tổng thể (Risk Assessment Matrix)

| ID | Danh mục rủi ro | Chi tiết rủi ro | Mức độ nghiêm trọng (Severity) | Khả năng xảy ra (Likelihood) | Tác động (Impact) | Biện pháp kiểm soát & Phòng ngừa (Mitigation) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Database Confusion** | Hiện có 3 dự án Supabase độc lập (`bdel...`, `kdpo...`, `zdfu...`). Nếu dùng nhầm Service Role Key hoặc URL có thể gây gián đoạn dữ liệu production của website khác. | **CRITICAL** | Medium | Phá vỡ bảng dữ liệu đang chạy của 1 trong 3 website | **Zero-Touch Rule:** Nghiêm cấm chạy migration chung vào các DB cũ. Hàng đợi `ai_tasks` phải chạy trên một Supabase Control Center riêng biệt hoặc schema cô lập với tiền tố `ai_*`. |
| **RSK-02** | **Sync Dependency Cascade** | `gvcncdsai.io.vn` gọi HTTP đồng bộ trực tiếp sang `huycncdsai.io.vn/api/resources`. Nếu `huycncdsai` bị downtime hoặc deploy gián đoạn, `gvcncdsai` gặp cảnh báo lỗi fetch. | **HIGH** | Medium | Tính năng đồng bộ tài liệu giáo viên bị gián đoạn | Chuyển giao thức đồng bộ sang Asynchronous Task Queue trong `huy-ai-center`. |
| **RSK-03** | **Serverless Timeout** | Gọi mô hình AI trực tiếp từ Next.js Route Handler trên Vercel gặp giới hạn 10s (Hobby) hoặc 60s (Pro). Tác vụ nặng (OCR hóa đơn, xử lý slide bài giảng, RAG flow) bị drop kết nối. | **HIGH** | High | Người dùng bị timeout 504 Gateway Timeout khi yêu cầu AI nặng | Kiến trúc Decoupled Queue: Web chỉ gửi task (`queued`), nhận Task ID ngay lập tức (201 Created), sau đó poll trạng thái hoặc nhận kết quả qua Realtime/Webhook. |
| **RSK-04** | **Hardware Offline (Dell M4800)** | Máy chủ nội bộ Dell Precision M4800 chưa sẵn sàng hoặc có thể mất điện, khởi động lại, mất mạng tạm thời. | **HIGH** | High | Tắc nghẽn xử lý nếu web gọi trực tiếp vào máy Dell | **Decoupled Architecture:** Web không bao giờ biết IP máy Dell. Khi Dell offline, task nằm an toàn ở trạng thái `queued` trên Supabase. Khi Dell online, worker tự động claim xử lý. |
| **RSK-05** | **Auth Fragmentation** | 3 website dùng 3 cơ chế xác thực khác nhau (admin password cookie, role cookie, JWT multi-tenant). Không thể xác định danh tính duy nhất của người dùng khi gửi task vào queue. | **MEDIUM** | High | Không thống kê được hạn ngạch (quota) dùng AI theo từng người dùng | Trong giai đoạn V1, task queue sử dụng trường `source_app` (`huycncdsai`, `gvcncdsai`, `smarttax_ai`) kết hợp định danh người dùng do client tự chuyển tiếp. |
| **RSK-06** | **Secret / Key Leakage** | Lộ lọt `SUPABASE_SERVICE_ROLE_KEY` hoặc API keys của các nhà cung cấp AI khi commit mã nguồn lên GitHub. | **CRITICAL** | Low | Toàn quyền truy cập cơ sở dữ liệu bị chiếm đoạt | Kịch bản `scripts/verify-safety.ps1` kiểm tra tự động trước mỗi commit; `.gitignore` bảo vệ chặt chẽ các file `.env*`. |
| **RSK-07** | **Worker Concurrency Race** | Nhiều worker cùng nhặt 1 task AI từ Supabase dẫn đến việc xử lý trùng lặp và lãng phí tài nguyên tính toán của máy Dell. | **MEDIUM** | Medium | Trùng lặp kết quả, quá tải GPU/CPU của Dell M4800 | Thủ tục SQL `claim_ai_task` sử dụng cơ chế khóa hàng nguyên tử `FOR UPDATE SKIP LOCKED`. |

---

## 2. Kế hoạch ứng phó sự cố (Incident Response Plan)

1. **Khi phát hiện lỗi kết nối tới Supabase:**
   - Worker tự động kích hoạt chế độ **Exponential Backoff Retry** (đã viết tại `@huy-ai/shared/retry.ts`), không làm nghẽn CPU.
2. **Khi máy chủ Dell M4800 bị tắt đột ngột giữa lúc đang chạy task:**
   - Các task đang ở trạng thái `running` quá thời hạn `timeout_seconds` sẽ được hệ thống đánh dấu thành `timeout` hoặc tự động hoàn trả về `queued` nếu chưa vượt quá `max_retries`.
3. **Khi phát hiện commit nhầm file môi trường:**
   - Lập tức thu hồi (revoke) key trên trang quản trị Supabase / AI Provider và tạo key mới, xóa cache commit bằng `git filter-branch` hoặc gỡ bỏ commit trước khi push.
