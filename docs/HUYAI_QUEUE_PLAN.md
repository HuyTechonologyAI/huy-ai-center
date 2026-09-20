# HUYAI QUEUE ARCHITECTURE & DEPLOYMENT PLAN

**Trạng thái:** KẾ HOẠCH HÀNG ĐỢI ĐA TẦNG (ZERO-REDIS QUEUE ARCHITECTURE)  
**Tác giả:** Lead Software Architect + DevOps Integration Engineer  
**Chi phí cơ sở hạ tầng hàng tháng:** **$0.00 USD**

---

## 1. Chiến Lược Hàng Đợi Hai Tầng (Dual-Mode Queue Architecture)

Hệ sinh thái AI Center V1.1 loại bỏ hoàn toàn Redis, BullMQ hoặc các dịch vụ hàng đợi đám mây có phí (Upstash, AWS SQS) để tuân thủ giới hạn chi phí tối đa $30 USD/tháng. Thay vào đó, hệ thống triển khai kiến trúc tự thích ứng 2 tầng:

```text
                     Control Center / Web APIs
                                │
                        [Enqueue AI Task]
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │  Khả năng hỗ trợ pgmq trên HuyAI?     │
            └───────────────────┬───────────────────┘
                                │
               ┌────────────────┴────────────────┐
               │ CÓ                              │ CHƯA HỖ TRỢ
               ▼                                 ▼
      [TẦNG 1: PGMQ Queue]             [TẦNG 2: Postgres Native Queue]
         Queue: ai-jobs                   Table: queue_messages & ai_tasks
       pgmq.send / read                 claim_ai_task (FOR UPDATE SKIP LOCKED)
               │                                 │
               └────────────────┬────────────────┘
                                │
                                ▼
                     Dell Precision M4800
                   (apps/dispatcher worker)
```

### 1.1. Tầng 1: Supabase Queues / pgmq Extension (Ưu tiên số 1)
- **Cơ chế:** Khi Supabase Cloud hỗ trợ tiện ích mở rộng `pgmq`, hệ sinh thái sẽ kích hoạt:
  ```sql
  DO $$
  BEGIN
      CREATE EXTENSION IF NOT EXISTS pgmq;
      PERFORM pgmq.create('ai-jobs');
  EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pgmq extension not available in this Supabase tier; fallback active.';
  END $$;
  ```
- **Ưu điểm:** Tích hợp sâu vào PostgreSQL, hỗ trợ visibility timeout, dead-letter archiving và batch read hiệu năng cao.

### 1.2. Tầng 2: PostgreSQL Native Queue Fallback (Đảm bảo hoạt động 100%)
- **Cơ chế:** Sử dụng bảng `queue_messages` và `ai_tasks` kết hợp cơ chế khóa dòng nguyên tử `FOR UPDATE SKIP LOCKED`.
- **Hàm xử lý nguyên tử:**
  ```sql
  CREATE OR REPLACE FUNCTION public.claim_ai_task(p_worker_id TEXT)
  RETURNS SETOF public.ai_tasks 
  SET search_path = public, pg_temp
  LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
      v_task_id UUID;
  BEGIN
      SELECT id INTO v_task_id
      FROM public.ai_tasks
      WHERE status = 'queued'
      ORDER BY 
          CASE priority 
              WHEN 'urgent' THEN 1
              WHEN 'high' THEN 2
              WHEN 'normal' THEN 3
              WHEN 'low' THEN 4
              ELSE 5 
          END ASC,
          created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      IF v_task_id IS NOT NULL THEN
          RETURN QUERY
          UPDATE public.ai_tasks
          SET 
              status = 'claimed',
              claimed_by_node_id = p_worker_id,
              claimed_at = timezone('utc'::text, now()),
              updated_at = timezone('utc'::text, now())
          WHERE id = v_task_id
          RETURNING *;
      END IF;
      RETURN;
  END;
  $$;
  ```
- **Đặc tính chống Race Condition:**
  - `FOR UPDATE SKIP LOCKED` cho phép hàng chục worker trên Dell Precision M4800 (hoặc mở rộng thêm node sau này) cùng thăm dò một bảng mà không bao giờ bị đụng độ (deadlock) hoặc nhận trùng cùng một task.

---

## 2. Quản Lý Vòng Đời Tác Vụ (Task Lifecycle Management)

1. **Khởi tạo (Enqueue):**
   - API `/api/ai/tasks` chèn dòng mới với `status = 'queued'`, `priority`, `source_app`, `payload`.
2. **Nhận tác vụ (Claim):**
   - Dispatcher Poller gọi `claim_ai_task('huy-ai-node-01')`. Trạng thái chuyển sang `'claimed'`.
3. **Gia hạn thời gian xử lý (Lease Renewal):**
   - Đối với các tác vụ dài (ví dụ: tạo giáo án 5512 kèm slide và câu hỏi), worker định kỳ mỗi 30 giây gửi heartbeat gia hạn `claimed_at`, tránh tình trạng task bị worker khác giành lại nếu quá hạn `timeout_seconds`.
4. **Xử lý lỗi & Thử lại (Retry & Backoff):**
   - Nếu xảy ra lỗi mạng với adapter ngoài, tăng `retry_count`. Nếu `retry_count < max_retries`, task trở lại trạng thái `'queued'`.
   - Nếu vượt quá `max_retries`, chuyển trạng thái `'failed'` kèm thông điệp lỗi chi tiết trong `error`.
5. **Hoàn thành (Completion):**
   - Lưu kết quả vào `ai_outputs` và đánh dấu `ai_tasks.status = 'completed'`.

---

## 3. Đánh Giá Khả Năng Mở Rộng & Tiêu Thụ Tài Nguyên
- **Dell Precision M4800:**
  - 32 GB RAM đáp ứng thoải mái hơn 50 worker processes đồng thời mà không chiếm quá 5% RAM.
  - Tần suất thăm dò mặc định: 1500ms khi rảnh, giảm xuống 200ms khi có hàng đợi dồn tải.
- **Tải trên Supabase HuyAI:**
  - Chỉ mục `idx_ai_tasks_queue_poll` có điều kiện `WHERE status = 'queued'` đảm bảo kích thước B-tree index chỉ chứa vài chục dòng đang chờ, tốc độ quét chỉ mất **< 1 millisecond** (0.001s).
  - Không gây tốn CPU hay IOPS trên gói Supabase của hệ thống.
