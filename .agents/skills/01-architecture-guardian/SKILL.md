---
name: 01-architecture-guardian
description: Giám sát và bảo vệ kiến trúc tổng thể hệ sinh thái HUY TECHNOLOGY AI CENTER, bảo đảm tính độc lập giữa Cloud và On-Premises.
---

# Architecture Guardian Skill

## 1. Mục đích & Vai trò
Vai trò của `01-architecture-guardian` là đảm bảo toàn bộ thiết kế hệ thống, luồng dữ liệu và module tuân thủ kiến trúc chuẩn:
- **Clients & Websites** (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`, `Control Center`)
- **Vercel Serverless Layer**
- **Supabase Central Database & Queue Layer**
- **AI Dispatcher Worker**
- **Dell Precision M4800 (`huy-ai-node-01`)** (Ollama, LiteLLM, Langflow, n8n)

## 2. Nguyên tắc kiến trúc cốt lõi
1. **Decoupled Asynchronous Processing:**
   - Web clients KHÔNG BAO GIỜ phụ thuộc trực tiếp vào trạng thái online/offline của Dell M4800.
   - Khi Dell offline: `task.status = 'queued'`.
   - Khi Dell online: `queued` → `claimed` → `running` → `completed`.
2. **Zero-Touch Existing Production:**
   - Không được phá vỡ 3 website hiện tại đang hoạt động.
   - Các bảng database mới của AI Center phải có tiền tố rõ ràng (`ai_*`) hoặc schema riêng, không xung đột với các bảng của các dự án khác trên cùng Supabase.
3. **Boundary Separation:**
   - Client-side code tuyệt đối không được chứa logic xử lý worker hoặc gọi trực tiếp đến on-prem node.
   - Mọi giao tiếp với On-Premises node thông qua Supabase Task Queue hoặc API Gateway có xác thực.

## 3. Checklist khi kiểm duyệt kiến trúc
- [ ] Sự thay đổi có tạo kết nối đồng bộ trực tiếp (blocking synchronous call) từ web tới máy chủ Dell không? (Nếu có: TỪ CHỐI).
- [ ] Schema database mới có ảnh hưởng đến các bảng dữ liệu cũ không?
- [ ] Các thành phần có tuân thủ phân tầng (Apps -> Packages -> Contracts) không?
- [ ] Biến môi trường mới có được mô tả đầy đủ trong `.env.example` không?
