# ADR-002: Kiến Trúc Tối Ưu Hóa Chi Phí V1 (Cost-Optimized V1 Architecture)

- **Trạng thái:** ACCEPTED (AUTHORITATIVE PATCH V1.1)
- **Ngày quyết định:** 18/09/2026
- **Người đề xuất:** Lead Software Architect & System Engineer
- **Phạm vi:** Hạ tầng tính toán, Hàng đợi, Mô hình AI và Quản trị ngân sách

---

## 1. Bối cảnh (Context)
Trong giai đoạn đầu phát triển (V1), mục tiêu sống còn là đưa hệ thống HUY TECHNOLOGY AI CENTER vào vận hành ổn định, phục vụ giáo viên và doanh nghiệp với **chi phí vận hành đám mây tối thiểu (Hạn mức $0 – $30 USD / tháng)**.

Nhiều giải pháp công nghệ thường thấy trong các hệ thống quy mô lớn (Enterprise) như Redis, LiteLLM, OpenHands, GPU Cloud... có thể mang lại sự tiện ích nhất định, nhưng lại tạo ra gánh nặng chi phí định kỳ, đòi hỏi bảo trì phức tạp và chưa cần thiết trong quy mô thực tế hiện tại.

---

## 2. Quyết định (Decision)
Hệ sinh thái chính thức áp dụng chính sách hoãn lại (DEFERRED) và hủy bỏ các thành phần tốn kém trong phiên bản V1:

1. **Redis & Upstash Redis &rarr; DEFERRED (HOÃN LẠI):**
   - *Thay thế:* Sử dụng cơ chế hàng đợi thuần PostgreSQL Native Queue với kỹ thuật `FOR UPDATE SKIP LOCKED` trên cơ sở dữ liệu Supabase có sẵn.
   - *Lý do:* Khối lượng tác vụ hiện tại hoàn toàn nằm trong khả năng chịu tải của Postgres; loại bỏ chi phí duy trì cụm Redis riêng.

2. **LiteLLM &rarr; DEFERRED (HOÃN LẠI):**
   - *Thay thế:* Kết nối trực tiếp từ Dispatcher và Langflow tới Ollama (chạy nội bộ trên Dell M4800) và Gemini API (Cloud pay-as-you-go).
   - *Lý do:* Chưa có nhu cầu định tuyến phức tạp giữa 3+ nhà cung cấp LLM lớn; tránh dựng thêm một container proxy trung gian khi chưa cần.

3. **OpenHands &rarr; DEFERRED (HOÃN LẠI):**
   - *Thay thế:* Sử dụng Google Antigravity kết hợp GitHub và quy trình kiểm duyệt của con người (Human Review).
   - *Lý do:* Tránh chi phí điện toán lớn và rủi ro tự động sửa đổi mã nguồn không kiểm soát trong môi trường sản xuất V1.

4. **GPU Cloud (RunPod, Lambda, Vast.ai...) &rarr; DEFERRED (HOÃN LẠI):**
   - *Thay thế:* Phân tách tải thông minh: Tác vụ nhẹ (phân loại, tóm tắt, RAG) xử lý trên CPU/iGPU máy Dell M4800; tác vụ nặng chuyển qua Gemini API đám mây trả tiền theo lượt.

5. **VPS / Máy chủ ảo bổ sung &rarr; DEFERRED (HOÃN LẠI):**
   - *Thay thế:* Tận dụng toàn diện máy trạm vật lý có sẵn Dell Precision M4800 (32GB RAM, 1TB SSD) kết nối Coolify.

6. **Dự án Supabase mới (`huy-ai-center-prod`) &rarr; CANCELLED (HỦY BỎ):**
   - *Thay thế:* Mở rộng trực tiếp dự án `HuyAI` (Singapore) hiện có.

---

## 3. Điều kiện xem xét lại trong tương lai (Re-evaluation Criteria for V2)
Các dịch vụ trên chỉ được xem xét kích hoạt lại khi:
- **Redis:** Lưu lượng hàng đợi vượt quá 100 tác vụ đồng thời mỗi giây hoặc độ trễ DB đạt ngưỡng cảnh báo.
- **LiteLLM:** Khi hệ thống tích hợp cùng lúc từ 3 nhà cung cấp mô hình thương mại trở lên (OpenAI, Anthropic, DeepSeek, Google, v.v.) và cần bảng điều khiển tổng hợp chi phí token tập trung.
- **OpenHands:** Khi bước vào giai đoạn tự động hóa phát triển phần mềm độc lập cấp độ 4 (Level 4 Agentic Engineering).
- **GPU Cloud:** Khi máy chủ Dell M4800 đạt ngưỡng tải 90% liên tục và nhu cầu fine-tuning mô hình nội bộ phát sinh thực tế.
