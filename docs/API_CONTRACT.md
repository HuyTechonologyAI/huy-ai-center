# AI TASK API CONTRACT SPECIFICATION — HUY TECHNOLOGY AI CENTER

Tài liệu đặc tả hợp đồng API giao tiếp chuẩn hóa giữa 3 website trong hệ sinh thái (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) và **HUY TECHNOLOGY AI CENTER**.

---

## 1. Nguyên tắc Thiết kế (Design Principles)

1. **Hạ tầng Ẩn hoàn toàn (Infrastructure Agnostic):** Các website frontend không bao giờ cần biết tác vụ sẽ được xử lý bởi máy chủ Dell Precision M4800, Ollama, LiteLLM hay Langflow. Chúng chỉ tương tác với các endpoint chuẩn hóa.
2. **Không tin tưởng Client (Zero-Trust Validation):** Mọi payload gửi lên đều được xác thực nghiêm ngặt bằng Zod schemas. Các trường không hợp lệ hoặc vượt quá kích thước (1MB) sẽ bị từ chối ngay lập tức.
3. **Cơ chế Chống trùng lặp (Idempotency):** Hỗ trợ header `Idempotency-Key` để bảo đảm an toàn khi mạng chập chờn hoặc trình duyệt gửi lại request (browser retry).
4. **Xác thực & Phân quyền:** Hỗ trợ xác thực qua `Authorization: Bearer <JWT>` (người dùng) hoặc `x-api-key: <KEY>` (giao tiếp server-to-server).

---

## 2. Danh mục Endpoints

| Phương thức | Đường dẫn Endpoint | Mục đích | Yêu cầu Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/ai/tasks` | Tạo mới tác vụ AI (enqueue) | Có |
| `GET` | `/api/ai/tasks/:id` | Tra cứu trạng thái và tiến độ xử lý | Có |
| `POST` | `/api/ai/tasks/:id/cancel` | Hủy tác vụ đang chờ xử lý | Có |
| `GET` | `/api/ai/tasks/:id/outputs` | Trích xuất kết quả đầu ra có cấu trúc | Có |
| `GET` | `/api/ai/history` | Tra cứu lịch sử tác vụ có phân trang | Có |

---

## 3. Đặc tả Chi tiết từng Endpoint

### 3.1. `POST /api/ai/tasks` — Tạo mới Tác vụ AI

#### Request Headers:
```http
Content-Type: application/json
Authorization: Bearer <user_session_token>
Idempotency-Key: <unique_client_generated_key> (Khuyến nghị)
```

#### Request Payload:
```json
{
  "source_app": "education",
  "task_type": "lesson_plan",
  "input": {
    "subject": "Toán học",
    "grade": 10,
    "topic": "Hàm số bậc hai",
    "duration_minutes": 45
  },
  "options": {
    "priority": "high",
    "timeout_seconds": 300,
    "model": "qwen2.5:7b"
  }
}
```

- `source_app` (Bắt buộc): `'education'` | `'portfolio'` | `'tax'` | `'general'`
- `task_type` (Bắt buộc): `'lesson_plan'` | `'tax_audit'` | `'invoice_ocr'` | `'slide_generation'` | `'document_qa'` | `'general_chat'`
- `input` (Bắt buộc): Đối tượng JSON chứa toàn bộ dữ liệu nghiệp vụ.
- `options` (Không bắt buộc):
  - `priority`: `'low'` | `'normal'` | `'high'` | `'urgent'` (mặc định: `'normal'`)
  - `timeout_seconds`: Thời gian chờ tối đa (mặc định: `300`)
  - `model`: Gợi ý mô hình ưu tiên

#### Response Thành công (HTTP 201 Created):
```json
{
  "task_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "status": "queued",
  "request_id": "req_1726589999_a1b2c3d4",
  "created_at": "2026-09-17T15:30:00.000Z"
}
```

*(Nếu kích hoạt `Idempotency-Key` và yêu cầu bị gửi lại, hệ thống trả về HTTP 200 kèm `idempotent_replay: true` mà không tạo thêm task mới).*

---

### 3.2. `GET /api/ai/tasks/:id` — Tra cứu Trạng thái Tác vụ

#### Response Thành công (HTTP 200 OK):
```json
{
  "task_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "source_app": "education",
  "task_type": "lesson_plan",
  "status": "running",
  "created_at": "2026-09-17T15:30:00.000Z",
  "started_at": "2026-09-17T15:30:02.100Z",
  "completed_at": null,
  "claimed_by_worker_id": "huy-ai-node-01",
  "progress_pct": 50
}
```

Các giá trị của `status`:
- `queued`: Đang xếp hàng chờ worker nhặt.
- `claimed`: Worker đã khóa bản ghi chuẩn bị chạy.
- `running`: Đang thực thi tính toán trên GPU/CPU.
- `waiting_approval`: Đang tạm dừng chờ người dùng duyệt trước khi chạy tiếp.
- `completed`: Hoàn tất thành công.
- `failed`: Xảy ra lỗi trong quá trình xử lý.
- `cancelled`: Đã bị hủy bỏ bởi người dùng.

---

### 3.3. `POST /api/ai/tasks/:id/cancel` — Hủy Tác vụ

#### Response Thành công (HTTP 200 OK):
```json
{
  "task_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "status": "cancelled",
  "cancelled_at": "2026-09-17T15:31:00.000Z",
  "message": "Task execution was successfully cancelled"
}
```

*(Nếu tác vụ đã ở trạng thái `completed`, hệ thống trả về lỗi HTTP 409 Conflict).*

---

### 3.4. `GET /api/ai/tasks/:id/outputs` — Lấy Kết quả Tác vụ

#### Response Thành công (HTTP 200 OK):
```json
{
  "task_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "status": "completed",
  "output": {
    "text": "Kế hoạch bài dạy chi tiết bài Hàm số bậc hai...",
    "json": {
      "sections": [
        { "title": "Khởi động", "durationMinutes": 5 },
        { "title": "Hình thành kiến thức", "durationMinutes": 25 }
      ]
    },
    "model": "qwen2.5:7b",
    "tokens": {
      "prompt": 150,
      "completion": 480,
      "total": 630
    },
    "latency_ms": 2340,
    "finish_reason": "stop"
  }
}
```

---

### 3.5. `GET /api/ai/history` — Tra cứu Lịch sử có Phân trang

#### Query Parameters:
- `page`: Số trang (mặc định: `1`)
- `limit`: Số bản ghi trên mỗi trang (mặc định: `20`, tối đa `100`)
- `status`: Lọc theo trạng thái (`completed`, `failed`, v.v.)
- `source_app`: Lọc theo ứng dụng gọi (`education`, `tax`, v.v.)

#### Response Thành công (HTTP 200 OK):
```json
{
  "tasks": [
    {
      "task_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "source_app": "education",
      "task_type": "lesson_plan",
      "status": "completed",
      "created_at": "2026-09-17T15:30:00.000Z",
      "started_at": "2026-09-17T15:30:02.100Z",
      "completed_at": "2026-09-17T15:30:04.440Z",
      "claimed_by_worker_id": "huy-ai-node-01",
      "progress_pct": 100
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "total_pages": 3
}
```

---

## 4. Mã Mẫu Tích hợp Client (TypeScript SDK Snippet)

Dành cho 3 website (`edtech-ai-portfolio`, `SmartTeacherSchedule`, `smarttax-ai`):

```typescript
import { CreateTaskRequest, CreateTaskResponse } from '@huy-ai/contracts';

export async function dispatchAITask(taskData: CreateTaskRequest): Promise<CreateTaskResponse> {
  const response = await fetch('https://ai-center.io.vn/api/ai/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getUserToken()}`,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`[${errorBody.error.code}] ${errorBody.error.message}`);
  }

  return response.json();
}
```
