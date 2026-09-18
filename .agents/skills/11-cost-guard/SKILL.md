---
name: 11-cost-guard
description: Ngăn chặn các dịch vụ trả phí không cần thiết, việc mở rộng hạ tầng tốn kém và các chi phí định kỳ phát sinh trong hệ sinh thái HUY TECHNOLOGY AI CENTER.
---

# Cost Guard Skill

## 1. Mục đích & Phạm vi kích hoạt
`11-cost-guard` là rào chắn kiểm soát tài chính tự động. Kỹ năng này BẮT BUỘC KÍCH HOẠT mỗi khi có một tác vụ đề xuất hoặc liên quan đến:
- SaaS mới
- Dịch vụ Cloud mới
- Cơ sở dữ liệu mới (New database / New PostgreSQL / Separate vector DB)
- VPS mới
- Dịch vụ GPU Cloud (RunPod, Lambda, Vast.ai...)
- API trả phí
- Dịch vụ giám sát trả phí (Datadog, New Relic, Grafana Cloud paid...)
- Lưu trữ trả phí bổ sung
- Dự án Supabase bổ sung (Đặc biệt: Huỷ bỏ kế hoạch tạo `huy-ai-center-prod` riêng; sử dụng dự án `HuyAI` hiện hữu tại Singapore)
- Dịch vụ Vercel trả phí bổ sung
- Nền tảng bên ngoài có phí
- Giấy phép doanh nghiệp (Enterprise license)
- Bất kỳ gói đăng ký định kỳ hàng tháng (Monthly subscription)

---

## 2. Bộ 10 Câu Hỏi Đánh Giá Bắt Buộc
Trước khi khuyến nghị hoặc triển khai bất kỳ dịch vụ trả phí nào, kỹ sư / agent phải trả lời đủ 10 câu hỏi:

1. **Dịch vụ hiện có đã có khả năng thực hiện việc này chưa?**  
   *(Ví dụ: Dùng Supabase PostgreSQL có sẵn thay vì mua thêm Redis / Vector DB).*
2. **Có giải pháp mã nguồn mở, miễn phí hoặc tự lưu trữ (self-hosted) thay thế không?**  
   *(Ví dụ: Coolify, Ollama, Langflow tự chạy trên Dell M4800).*
3. **Máy chủ Dell Precision M4800 (`huy-ai-node-01`) có thể đảm nhận khối lượng công việc này không?**  
   *(32GB RAM, 1TB SSD có thể chạy Dispatcher, Langflow, n8n, Ollama nhẹ).*
4. **Dự án Supabase `HuyAI` hiện có đã cung cấp được năng lực này chưa?**  
   *(Auth, Postgres Tables, Postgres Native Queue, Row Level Security, Storage).*
5. **Vercel hiện có đã cung cấp được năng lực này chưa?**  
   *(Next.js Serverless Routes, Edge Functions, Static Hosting).*
6. **GitHub hiện có đã cung cấp được năng lực này chưa?**  
   *(GitHub Actions CI/CD, Container Registry, Issues, Releases).*
7. **Cloudflare Free tier đã cung cấp được năng lực này chưa?**  
   *(DNS, CDN, SSL, Cloudflare Tunnel kết nối máy Dell ra Internet).*
8. **Việc này là BẮT BUỘC NGAY BÂY GIỜ hay chỉ cần thiết cho quy mô tương lai?**  
   *(Chỉ làm những gì thực sự cần cho V1; hoãn lại V2 nếu chưa cần).*
9. **Dịch vụ này có tạo ra chi phí định kỳ (recurring cost) không?**  
   *(Bất kỳ chi phí hàng tháng nào cũng phải được cảnh báo rõ ràng).*
10. **Lợi ích đo lường được nào chứng minh cho chi phí này?**  
    *(Phải có ROI hoặc số liệu cụ thể; không chi tiền vì "tiện" hoặc "thấy hay").*

---

## 3. Quyết định mặc định (Default Decision)
```text
DO NOT ADD NEW PAID SERVICE
```
Mặc định KHÔNG BỔ SUNG dịch vụ trả phí mới, trừ khi có yêu cầu nghiệp vụ rõ ràng và được sự phê duyệt bằng văn bản từ Lead Architect / Human Sponsor.
