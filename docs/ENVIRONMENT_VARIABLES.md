# ENVIRONMENT VARIABLES REFERENCE — HUY TECHNOLOGY AI CENTER

Tài liệu đặc tả toàn bộ biến môi trường sử dụng trong dự án `huy-ai-center`, phân loại theo cấp độ bảo mật và thành phần áp dụng.

---

## 1. Bảng Phân loại Cấp độ Bảo mật

- **PUBLIC (Công khai):** Biến an toàn có thể nhúng vào mã nguồn frontend/trình duyệt (bắt đầu bằng `NEXT_PUBLIC_`).
- **PRIVATE (Nội bộ Server):** Biến chỉ được truy cập trên môi trường Serverless hoặc Backend Route Handlers.
- **CRITICAL SECRET (Tuyệt mật):** Khóa quyền hạn cao (`service_role`), token quản trị. Tuyệt đối không để lộ cho client hoặc commit lên Git.

---

## 2. Danh mục Biến Môi trường Chi tiết

| Tên biến | Thành phần | Cấp độ bảo mật | Bắt buộc | Giá trị mặc định / Mẫu | Mô tả chức năng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Control Center | **PUBLIC** | Có | `https://your-project.supabase.co` | Đường dẫn kết nối tới Supabase Control Center |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Control Center | **PUBLIC** | Có | `eyJhbGci...` | Khóa công khai Anon Key cho client trình duyệt |
| `NEXT_PUBLIC_APP_URL` | Control Center | **PUBLIC** | Không | `http://localhost:3000` | URL gốc của ứng dụng Control Center |
| `PORT` | Control Center | **PRIVATE** | Không | `3000` | Cổng HTTP lắng nghe của ứng dụng Next.js |
| `SUPABASE_URL` | Dispatcher | **PRIVATE** | Có | `https://your-project.supabase.co` | URL kết nối Supabase từ worker daemon |
| `SUPABASE_SERVICE_ROLE_KEY` | Dispatcher / Server | **CRITICAL SECRET** | Có | `eyJhbGci...` | Khóa Service Role quyền hạn cao dùng để claim task và ghi log |
| `WORKER_NODE_ID` | Dispatcher | **PRIVATE** | Không | `huy-ai-node-01` | Mã định danh duy nhất của node worker |
| `WORKER_NODE_NAME` | Dispatcher | **PRIVATE** | Không | `Dell Precision M4800 Primary Node` | Tên hiển thị người dùng của node worker |
| `WORKER_POLL_INTERVAL_MS` | Dispatcher | **PRIVATE** | Không | `3000` | Chu kỳ thăm dò hàng đợi tính bằng mili-giây |
| `WORKER_HEARTBEAT_INTERVAL_MS` | Dispatcher | **PRIVATE** | Không | `10000` | Chu kỳ gửi tín hiệu sống (Heartbeat) về Supabase |
| `WORKER_CONCURRENCY` | Dispatcher | **PRIVATE** | Không | `2` | Số lượng tác vụ AI được phép chạy đồng thời trên node |
| `DISPATCHER_HEALTH_PORT` | Dispatcher | **PRIVATE** | Không | `8080` | Cổng phục vụ kiểm tra sức khỏe HTTP (`/health`, `/ready`) |
| `WORKER_LOG_LEVEL` | Dispatcher | **PRIVATE** | Không | `info` | Mức độ chi tiết nhật ký (`debug`, `info`, `warn`, `error`) |
| `OLLAMA_BASE_URL` | Dispatcher | **PRIVATE** | Không | `http://127.0.0.1:11434` | Địa chỉ máy chủ Ollama chạy trên mạng nội bộ |
| `LITELLM_BASE_URL` | Dispatcher | **PRIVATE** | Không | `http://127.0.0.1:4000` | Địa chỉ máy chủ định tuyến LiteLLM Router |
| `LITELLM_API_KEY` | Dispatcher | **CRITICAL SECRET** | Không | `sk-litellm-...` | Khóa xác thực LiteLLM (nếu có kích hoạt auth) |
| `LANGFLOW_BASE_URL` | Dispatcher | **PRIVATE** | Không | `http://127.0.0.1:7860` | Địa chỉ máy chủ Langflow Agent Orchestrator |
| `LANGFLOW_API_KEY` | Dispatcher | **CRITICAL SECRET** | Không | `langflow-...` | Khóa API bảo mật của Langflow |
| `N8N_BASE_URL` | Dispatcher | **PRIVATE** | Không | `http://127.0.0.1:5678` | Địa chỉ máy chủ tự động hóa quy trình n8n |
| `N8N_API_KEY` | Dispatcher | **CRITICAL SECRET** | Không | `n8n-...` | Khóa API Webhook của n8n |

---

## 3. Nguyên tắc Quản lý Biến Môi trường

1. Luôn sao chép từ `.env.example` khi bắt đầu môi trường mới.
2. Kiểm tra tính hợp lệ của biến bằng Zod validator tại runtime (`@huy-ai/config`). Nếu thiếu biến bắt buộc, ứng dụng sẽ tự động từ chối khởi động và in thông báo lỗi rõ ràng.
3. Không bao giờ commit tệp chứa biến môi trường thật (`.env`, `.env.local`, `.env.production`) vào Git.
