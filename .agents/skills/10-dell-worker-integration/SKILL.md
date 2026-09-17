---
name: 10-dell-worker-integration
description: Hướng dẫn cấu hình hạ tầng, Docker Compose, Coolify, mô hình AI (Ollama, LiteLLM, Langflow, n8n) trên máy chủ Dell Precision M4800.
---

# Dell Worker Integration Skill

## 1. Mục đích & Vai trò
Chuyên trách quy chuẩn tích hợp, tối ưu phần cứng và triển khai các dịch vụ AI trên node phần cứng On-Premises:
- **Máy chủ:** Dell Precision M4800
- **Phần cứng:** 32 GB RAM, 1 TB Storage
- **Hệ điều hành:** Ubuntu Server 24.04 LTS
- **Hostname:** `huy-ai-node-01`

## 2. Danh mục dịch vụ triển khai trên Dell M4800
1. **Coolify:** Nền tảng quản lý container & app tự động (Self-hosted PaaS).
2. **AI Dispatcher Worker:** Container Node.js chạy ngầm, kết nối Supabase Task Queue và điều phối công việc tới các dịch vụ AI nội bộ.
3. **Ollama:** Chạy các mô hình LLM mã nguồn mở (Qwen 2.5, DeepSeek R1 Distill, Llama 3) tối ưu cho RAM 32GB (CPU/GPU acceleration nếu có Quadro K1100M/K2100M).
4. **LiteLLM:** Proxy & Load balancer chuyển tiếp giữa các model nội bộ và Cloud APIs khi cần fallback.
5. **Langflow:** Công cụ trực quan xây dựng các luồng RAG & AI Agent đa bước.
6. **n8n:** Nền tảng tự động hóa quy trình nghiệp vụ kết nối các webhook và API.
7. **GitHub Radar & Monitoring:** Giám sát sức khỏe phần cứng (CPU, RAM, Nhiệt độ, Disk space) và báo cáo heartbeat về Supabase.

## 3. Nguyên tắc vận hành Decoupled
- **Không giả định trạng thái:** Hệ thống Cloud không bao giờ phụ thuộc vào việc Dell M4800 đang bật hay tắt.
- **Biến môi trường linh hoạt:** Node Dell kết nối với Cloud hoàn toàn thông qua các biến môi trường:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `WORKER_NODE_ID=huy-ai-node-01`
- **Graceful Reconnection:** Khi máy tính Dell khởi động lại hoặc mất mạng tạm thời, Worker tự động kết nối lại (auto-reconnect with exponential backoff) mà không làm mất mát các task đang chờ trong hàng đợi.
