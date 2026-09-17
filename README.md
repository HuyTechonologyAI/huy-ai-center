# HUY TECHNOLOGY AI CENTER

Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY.

---

## 1. Giới thiệu

**HUY TECHNOLOGY AI CENTER** là lớp hạ tầng trung tâm kết nối các dịch vụ frontend hiện hữu với các mô hình AI/LLM và luồng tự động hóa chạy trên cả hạ tầng Cloud lẫn máy chủ nội bộ (Dell Precision M4800).

### Hệ sinh thái hiện có:
- **Huy AI Portfolio:** [https://www.huycncdsai.io.vn/](https://www.huycncdsai.io.vn/)
- **Smart Teacher Schedule:** [https://www.gvcncdsai.io.vn/](https://www.gvcncdsai.io.vn/)
- **SmartTax AI:** [https://smarttax-ai.vercel.app/](https://smarttax-ai.vercel.app/)

### Máy chủ On-Premises (Chuẩn bị):
- **Model:** Dell Precision M4800
- **Hardware:** 32 GB RAM, 1 TB Storage
- **OS:** Ubuntu Server 24.04 LTS
- **Hostname:** `huy-ai-node-01`
- **Dịch vụ:** Docker, Coolify, Langflow, Ollama, LiteLLM, n8n, AI Dispatcher Worker

---

## 2. Kiến trúc luồng xử lý (Data & Task Flow)

```mermaid
flowchart TD
    subgraph Clients["Websites & End Users"]
        W1["huycncdsai.io.vn"]
        W2["gvcncdsai.io.vn"]
        W3["smarttax-ai.vercel.app"]
        CC["Control Center UI"]
    end

    subgraph Cloud["Vercel & Supabase Cloud"]
        Vercel["Vercel Serverless API"]
        SupaDB[("Supabase Control Center")]
        Queue[("AI Task Queue (ai_tasks)")]
    end

    subgraph Node["Dell Precision M4800 (huy-ai-node-01)"]
        Dispatcher["AI Dispatcher Worker"]
        Ollama["Ollama (Local LLMs)"]
        LiteLLM["LiteLLM Router"]
        Langflow["Langflow"]
        N8N["n8n Automation"]
    end

    Clients -->|Submit Task| Vercel
    Vercel -->|Insert Task (queued)| Queue
    Queue --> SupaDB

    Dispatcher -->|Poll / Claim (running)| Queue
    Dispatcher -->|Inference| Ollama
    Dispatcher -->|Route| LiteLLM
    Dispatcher -->|Execute Flow| Langflow
    Dispatcher -->|Workflow| N8N

    Dispatcher -->|Update Result (completed)| Queue
    Queue -->|Realtime / Webhook| Clients
```

### Nguyên tắc Decoupling:
- Các website không bao giờ gọi trực tiếp vào IP của máy chủ Dell.
- Toàn bộ giao tiếp được thực hiện bất đồng bộ qua **AI Task Queue** trên Supabase.
- Khi máy chủ Dell offline, trạng thái task vẫn lưu ở `queued`. Khi máy chủ Dell online, Dispatcher tự động claim task và xử lý.

---

## 3. Cấu trúc Repository

```text
huy-ai-center/
├── apps/
│   ├── control-center/     # Next.js Dashboard quản trị task queue & worker
│   └── dispatcher/         # Node.js/TypeScript worker daemon kết nối AI services
├── packages/
│   ├── contracts/          # Hợp đồng dữ liệu & Zod schemas dùng chung
│   ├── config/             # Cấu hình eslint, prettier, tsconfig dùng chung
│   └── shared/             # Thư viện tiện ích, logger, retry helpers
├── supabase/
│   ├── migrations/         # SQL migration cho AI Task Queue & Worker nodes
│   ├── functions/          # Edge Functions điều phối
│   └── seed/               # Dữ liệu khởi tạo kiểm thử
├── docs/                   # Tài liệu kiến trúc & Sổ tay vận hành (Runbooks)
├── scripts/                # Scripts kiểm tra an toàn, bảo mật & CI/CD
├── tests/                  # Test suites tổng hợp
├── docker/                 # Docker Compose & Dockerfile cho Dell M4800
├── .agents/skills/         # 10 Agent Skills chuyên biệt hỗ trợ phát triển
├── .env.example            # Mẫu cấu hình biến môi trường
├── PROJECT_STATE.md        # Theo dõi tiến độ & trạng thái chuẩn hóa
└── README.md
```

---

## 4. Bắt đầu phát triển (Quick Start)

### Yêu cầu:
- Node.js >= 20.0.0 (khuyến nghị v24+)
- npm >= 10.0.0
- Docker (dành cho node worker hoặc môi trường test)

### Cài đặt:
```bash
# 1. Cài đặt dependencies toàn bộ workspace
npm install

# 2. Tạo file cấu hình từ template
cp .env.example .env

# 3. Kiểm tra tính toàn vẹn typecheck
npm run typecheck

# 4. Chạy kiểm thử
npm run test
```

---

## 5. Quy tắc an toàn Production

1. Tuyệt đối không commit file `.env` hoặc bất kỳ Secret/API Key nào lên Git.
2. Không thực hiện migration phá hủy dữ liệu của các website hiện tại.
3. Mọi tính năng mới phải đi qua quy trình:
   `Inspect` → `Plan` → `Branch` → `Implement` → `Test` → `Human Approval` → `Deploy`.
