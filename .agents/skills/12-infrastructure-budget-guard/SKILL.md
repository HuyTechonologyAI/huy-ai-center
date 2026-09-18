---
name: 12-infrastructure-budget-guard
description: Kiểm soát ngân sách hạ tầng điện toán đám mây cho HUY TECHNOLOGY AI CENTER, đảm bảo chi phí định kỳ luôn nằm trong hạn mức 0 - 30 USD/tháng.
---

# Infrastructure Budget Guard Skill

## 1. Mục tiêu ngân sách cốt lõi
Hệ sinh thái HUY TECHNOLOGY AI CENTER vận hành theo mô hình tối ưu hóa chi phí (**COST-OPTIMIZED ARCHITECTURE V1.1**):

```text
TARGET CLOUD COST V1:
$0 – $30 USD / tháng (không bao gồm tiền điện máy chủ Dell M4800)

GIAI ĐOẠN THƯƠNG MẠI HÓA BAN ĐẦU:
Dao động xung quanh $25 – $30 USD / tháng
```

---

## 2. Kiến trúc hạ tầng chuẩn V1.1
Mọi thành phần phải tuân thủ nghiêm ngặt danh mục đã duyệt:

| Thành phần | Phân loại chi phí | Nền tảng |
|---|---|---|
| **Vercel** | PLAN DEPENDENT (Ưu tiên Free/Pro tối giản) | Hosting 3 Website & Control Center |
| **Supabase: HuyAI** | FREE WITH LIMITS (Tận dụng dự án Singapore hiện có) | Auth, Database, Native Queue, RLS, Storage |
| **Cloudflare** | FREE WITH LIMITS | DNS, CDN, DDoS Protection, Cloudflare Tunnel |
| **GitHub** | FREE WITH LIMITS | Repositories, Version Control, Actions CI |
| **Dell Precision M4800** | SELF-HOSTED (Chi phí phần cứng đã khấu hao) | `huy-ai-node-01` (32GB RAM, 1TB SSD) |
| **Coolify** | SELF-HOSTED | PaaS quản trị container nội bộ trên Dell |
| **Langflow** | SELF-HOSTED | Điều phối workflow AI cục bộ |
| **n8n** | SELF-HOSTED INTERNAL | Tự động hóa nội bộ, backup, cronjobs |
| **Ollama** | SELF-HOSTED | Mô hình nhẹ (Qwen 2.5) phục vụ phân loại, tóm tắt |
| **Gemini API** | PAY-AS-YOU-GO | Trí tuệ nhân tạo đám mây chính xác, tính theo lượng dùng thực tế |

---

## 3. Quy trình tính toán trước khi đề xuất hạ tầng
Trước khi đề xuất hoặc thêm bất kỳ hạ tầng nào, agent BẮT BUỘC phải lập bảng tính toán:

```text
1. CURRENT MONTHLY COST (Chi phí hàng tháng hiện tại):
2. NEW MONTHLY COST (Chi phí hàng tháng mới dự kiến):
3. ANNUALIZED COST (Chi phí quy đổi theo năm = New * 12):
4. WHY REQUIRED (Lý do bắt buộc phải có thành phần này):
5. WHAT EXISTING COMPONENT CANNOT DO IT (Tại sao các thành phần hiện tại không làm được):
6. FREE ALTERNATIVE (Giải pháp thay thế miễn phí):
7. SELF-HOSTED ALTERNATIVE (Giải pháp tự host trên Dell M4800):
```

---

## 4. Ngưỡng dừng khẩn cấp (Hard Stop Rule)
> [!CAUTION]
> Nếu chi phí định kỳ dự kiến vượt quá **$30 USD / tháng**:
> - **AGENT PHẢI DỪNG LẠI NGAY LẬP TỨC (HARD STOP).**
> - KHÔNG tự ý tạo tài nguyên, không thêm cấu hình thanh toán.
> - Báo cáo bảng tính chi phí và chờ phê duyệt bằng văn bản từ con người (Human Approval).
> - Tuyệt đối không bao giờ âm thầm đưa hạ tầng trả phí vào hệ thống.
