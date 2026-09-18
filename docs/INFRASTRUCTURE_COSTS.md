# Bảng Phân Loại & Quản Trị Chi Phí Hạ Tầng (Infrastructure Costs)

**Hệ sinh thái:** HUY TECHNOLOGY AI CENTER  
**Kiến trúc:** COST-OPTIMIZED ARCHITECTURE V1.1  
**Mục tiêu ngân sách:** `<= $30 USD / tháng`  
**Ngày cập nhật:** 18/09/2026

---

## 1. Bảng Phân Loại Chi Phí Các Dịch Vụ V1

| Dịch Vụ / Nền Tảng | Phân Loại Chi Phí | Chi Phí Hàng Tháng Dự Kiến | Vai Trò & Ghi Chú |
|---|---|---|---|
| **GitHub** | FREE WITH LIMITS | $0.00 | Quản lý mã nguồn, CI/CD Actions trong giới hạn Free Tier |
| **Supabase (`HuyAI`)** | FREE WITH LIMITS | $0.00 | Sử dụng lại dự án Supabase Singapore hiện hữu. Không tạo project mới. |
| **Cloudflare** | FREE WITH LIMITS | $0.00 | DNS, SSL, CDN, DDoS Protection & Cloudflare Tunnel |
| **Dell Precision M4800** | SELF-HOSTED | $0.00 (Không tính điện) | Máy chủ nội bộ `huy-ai-node-01` (32GB RAM, 1TB SSD) |
| **Coolify** | SELF-HOSTED | $0.00 | Bảng điều khiển Docker container tự host 100% mã nguồn mở |
| **Langflow** | SELF-HOSTED | $0.00 | Điều phối luồng xử lý AI chạy trực tiếp trên Docker máy Dell |
| **n8n** | SELF-HOSTED INTERNAL | $0.00 | Tự động hóa nội bộ (backup, telemetry, cronjobs, thông báo) |
| **Ollama** | SELF-HOSTED | $0.00 | Chạy các mô hình nhẹ (Qwen 2.5) phục vụ phân loại, tóm tắt |
| **Gemini API** | PAY-AS-YOU-GO | $0 – $15.00 | Mô hình Cloud LLM thông minh, chi phí theo lượt dùng thực tế |
| **Vercel** | PLAN DEPENDENT | PRICE_NOT_VERIFIED | Triển khai Frontend & Serverless API 3 website và Control Center |

---

## 2. Danh Mục Các Dịch Vụ Hoãn Lại (Deferred Services)

Để bảo đảm kiểm soát ngân sách tối đa và không làm phức tạp hóa hệ thống trong V1, các dịch vụ sau **tuyệt đối KHÔNG triển khai**:

| Dịch Vụ | Trạng Thái | Lý Do Hoãn Lại / Thay Thế |
|---|---|---|
| **Dự án Supabase mới (`huy-ai-center-prod`)** | **ĐÃ HỦY BỎ (CANCELLED)** | Mở rộng trực tiếp dự án `HuyAI` hiện có bằng các file SQL migration an toàn, tránh lãng phí chi phí vận hành. |
| **Redis** | **DEFERRED (HOÃN LẠI)** | Sử dụng kiến trúc hàng đợi thuần PostgreSQL Native Queues (`FOR UPDATE SKIP LOCKED`) trên Supabase có sẵn. |
| **LiteLLM** | **DEFERRED (HOÃN LẠI)** | Chỉ dùng khi có từ 3 provider mô hình trở lên hoặc cần bộ định tuyến proxy phức tạp. V1 dùng trực tiếp Langflow & Ollama/Gemini. |
| **OpenHands** | **DEFERRED (HOÃN LẠI)** | Tự động hóa công nghệ phần mềm trong V1 duy trì mô hình Antigravity + GitHub + Human Review. |
| **GPU Cloud (RunPod, Lambda...)** | **DEFERRED (HOÃN LẠI)** | Tận dụng CPU/iGPU máy Dell cho tác vụ nhẹ và Cloud API cho tác vụ nặng. |
| **Vector Database riêng biệt** | **DEFERRED (HOÃN LẠI)** | Dùng extension `pgvector` tích hợp sẵn trong Supabase nếu cần RAG. |
| **VPS / Máy chủ ảo bổ sung** | **DEFERRED (HOÃN LẠI)** | Toàn bộ workload On-Premises tập trung trên Dell Precision M4800. |
| **Dịch vụ Giám sát Trả phí** | **DEFERRED (HOÃN LẠI)** | Dùng endpoint `/health`, `/ready` và structured logs nhẹ nhàng, không dùng Datadog / New Relic. |

---

## 3. Tổng Hợp & Đánh Giá Ngân Sách

```text
Tổng chi phí cố định (Fixed Costs):          $0.00 / tháng
Chi phí biến đổi ước tính (Gemini API):     $5.00 – $15.00 / tháng
Chi phí Vercel hiện hữu:                     Theo gói tài khoản hiện hữu
-----------------------------------------------------------------
DỰ BÁO TỔNG CHI PHÍ ĐÁM MÂY V1:             $5.00 – $25.00 / tháng
HẠN MỨC NGÂN SÁCH TỐI ĐA (BUDGET CEILING):   $30.00 / tháng

Trạng thái ngân sách:                        WITHIN_BUDGET (ĐẠT CHUẨN AN TOÀN)
```
