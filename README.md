# HUY TECHNOLOGY AI CENTER

Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY.

---

## 1. Giới thiệu

**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`) là lớp hạ tầng trung tâm kết nối các dịch vụ frontend hiện hữu với các mô hình AI/LLM và luồng tự động hóa chạy trên cả hạ tầng Cloud (Vercel & Supabase) lẫn máy chủ nội bộ (Dell Precision M4800).

### Hệ sinh thái kết nối:
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
        Dispatcher["AI Dispatcher Worker\n(Health: Port 8080)"]
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

## 3. Cấu trúc Repository Monorepo

```text
huy-ai-center/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI (lint, typecheck, test, build - NO deploy)
├── apps/
│   ├── control-center/         # Next.js Dashboard quản trị task queue & worker
│   └── dispatcher/             # Node.js/TypeScript daemon worker + HTTP health endpoint (8080)
├── packages/
│   ├── contracts/              # Shared contracts (AITask, AITaskStep, AIOutput, Agent, Tool, Node, etc.)
│   ├── config/                 # Shared configs & runtime Zod environment validator
│   └── shared/                 # Logger đa cấp độ và bộ điều phối Exponential Backoff Retry
├── supabase/
│   ├── migrations/             # SQL migrations cho AI Task Queue, Worker nodes, RLS
│   ├── functions/              # Edge Functions điều phối
│   └── seed/                   # Dữ liệu khởi tạo kiểm thử
├── docs/                       # Hệ thống tài liệu kỹ thuật & kiến trúc
│   ├── SYSTEM_INVENTORY.md     # Kiểm kê toàn bộ hệ sinh thái
│   ├── CURRENT_ARCHITECTURE.md # Kiến trúc hiện tại
│   ├── RISK_REGISTER.md        # Quản trị rủi ro & kế hoạch ứng phó
│   ├── ARCHITECTURE_GAP_ANALYSIS.md # So sánh Current vs Target V1
│   ├── LOCAL_DEVELOPMENT.md    # Sổ tay lập trình cục bộ
│   ├── DEPLOYMENT_MODEL.md     # Mô hình triển khai phân tầng
│   └── ENVIRONMENT_VARIABLES.md # Bảng tra cứu biến môi trường
├── docker/                     # Docker Compose & Dockerfile cho máy chủ Dell M4800
├── scripts/                    # Scripts kiểm tra an toàn & bảo mật
├── .agents/skills/             # 10 Workspace Agent Skills
├── .env.example                # Mẫu cấu hình biến môi trường
├── PROJECT_STATE.md            # Bảng theo dõi tiến độ dự án
└── README.md
```

---

## 4. Tài liệu Tham khảo Nhanh (Quick Links)

- [Sổ tay Phát triển Cục bộ (Local Development)](docs/LOCAL_DEVELOPMENT.md)
- [Mô hình Triển khai Phân tầng (Deployment Model)](docs/DEPLOYMENT_MODEL.md)
- [Bảng tra cứu Biến môi trường (Environment Variables)](docs/ENVIRONMENT_VARIABLES.md)
- [Kiểm kê Hệ sinh thái (System Inventory)](docs/SYSTEM_INVENTORY.md)
- [Quản trị Rủi ro (Risk Register)](docs/RISK_REGISTER.md)
- [Phân tích Khoảng cách Kiến trúc (Gap Analysis)](docs/ARCHITECTURE_GAP_ANALYSIS.md)
- [Trạng thái Dự án (Project State)](PROJECT_STATE.md)

---

## 5. Quy tắc An toàn Tuyệt đối

1. Tuyệt đối không commit file `.env` hoặc bất kỳ Secret/API Key nào lên Git.
2. Không thực hiện migration phá hủy dữ liệu của các website hiện tại.
3. Không tự động deploy production qua CI. Mọi bản phát hành cần sự phê duyệt của con người.
