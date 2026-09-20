# HUYAI QUEUE ARCHITECTURE & IMPLEMENTATION PLAN
## PGMQ DEDICATED QUEUE SPECIFICATION (PHASE 06C)

**Trạng thái:** KIẾN TRÚC HÀNG ĐỢI DUY NHẤT (PGMQ ONLY)  
**Tiện ích cốt lõi:** `pgmq` (Supabase Queues, phiên bản `1.5.1` khả dụng trong cơ sở dữ liệu)  
**Tên Queue:** `ai-jobs`  
**Chi phí phát sinh:** **$0.00 USD/tháng** (Zero Redis, Zero Upstash, Zero Custom Queue Tables)

---

## 1. Kiến Trúc Hàng Đợi Chuẩn (Streamlined Queue Architecture)

Tuân thủ nghiêm ngặt chỉ đạo kỹ thuật Phase 06C, hệ thống **loại bỏ hoàn toàn** bảng tự tạo `queue_messages` và không duy trì giải pháp dự phòng kép. Hệ thống sử dụng duy nhất tiện ích mở rộng chuẩn **`pgmq`** của Supabase:

```text
                     Web Applications / API Gateway
                                   │
                                   ▼ (POST /api/ai/tasks)
                        [INSERT public.ai_tasks]
                                   │
                                   ▼ (pgmq.send)
                     ┌───────────────────────────┐
                     │     PGMQ Queue: ai-jobs   │
                     │  (schema pgmq.q_ai_jobs)  │
                     └─────────────┬─────────────┘
                                   │
                                   ▼ (pgmq.read / visibility timeout)
                        Dell Precision M4800
                      (apps/dispatcher worker)
                                   │
                      ┌────────────┴────────────┐
                      ▼                         ▼
                 Thành Công                  Thất Bại
             (pgmq.archive / delete)     (pgmq retry / fail)
                      │                         │
                      ▼                         ▼
              [ai_tasks: completed]     [ai_tasks: failed]
              [ai_outputs: inserted]    [ai_tasks.error: updated]
```

---

## 2. Thiết Lập & Khởi Tạo Hàng Đợi (Queue Setup)

Trong migration `20260920000005_queue_and_governance.sql`:
1. **Kích hoạt Extension:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgmq;
   ```
2. **Khởi tạo Hàng đợi `ai-jobs` (Idempotent):**
   ```sql
   DO $$
   BEGIN
       PERFORM pgmq.create('ai-jobs');
       RAISE NOTICE 'PGMQ queue ai-jobs verified/created successfully.';
   EXCEPTION WHEN OTHERS THEN
       RAISE NOTICE 'Notice on pgmq.create(ai-jobs): %', SQLERRM;
   END $$;
   ```
3. **Cấu trúc thông điệp trong `ai-jobs`:**
   ```json
   {
     "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
     "task_type": "lesson_plan",
     "source_app": "education",
     "priority": "normal",
     "input": {
       "subject": "Tin học",
       "grade": "Lớp 8",
       "topic": "Mạng máy tính và Internet",
       "periods": 2
     },
     "options": {
       "timeout_seconds": 300,
       "max_retries": 3
     }
   }
   ```

---

## 3. Quản Lý Vòng Đời Thông Điệp (Message Lifecycle & Visibility Timeout)

1. **Gửi thông điệp (Enqueue):**
   ```sql
   SELECT * FROM pgmq.send(
       queue_name => 'ai-jobs',
       msg => jsonb_build_object('task_id', task_id, 'task_type', task_type, 'input', input),
       delay => 0
   );
   ```
2. **Nhận thông điệp (Read with Visibility Timeout):**
   - Dispatcher trên Dell Precision M4800 đọc thông điệp kèm visibility timeout (mặc định 300 giây):
   ```sql
   SELECT * FROM pgmq.read(
       queue_name => 'ai-jobs',
       vt => 300,
       qty => 1
   );
   ```
   - Trong suốt 300 giây, các worker khác sẽ không nhìn thấy thông điệp này.
3. **Lưu trữ hoặc Xóa sau khi hoàn thành:**
   - Khi hoàn thành xử lý, worker gọi hàm lưu trữ hoặc xóa:
   ```sql
   SELECT pgmq.archive('ai-jobs', msg_id);
   -- hoặc: SELECT pgmq.delete('ai-jobs', msg_id);
   ```
4. **Xử lý lỗi & Dead-Letter:**
   - Nếu worker bị tắt đột ngột (crash/power loss), sau 300 giây thông điệp sẽ tự động hiển thị lại để worker khác nhận xử lý.
   - PGMQ tự động tăng trường `read_ct`. Nếu `read_ct > 3`, hệ thống chuyển task sang trạng thái `'failed'`.

---

## 4. Ưu Điểm So Với Bảng Custom Queue
1. **Zero Maintenance:** Tận dụng bảng nội bộ tối ưu của `pgmq` (`pgmq.q_ai_jobs`, `pgmq.a_ai_jobs`).
2. **Zero Schema Pollution:** Không sinh thêm bảng phụ trợ `queue_messages` trong schema `public`.
3. **Độ Tin Cậy ACID:** Thông điệp được bảo vệ bằng giao dịch PostgreSQL nguyên tử, không bao giờ mất việc khi restart server.
4. **Tiết Kiệm Chi Phí Tuyệt Đối:** $0/tháng, hoàn toàn nằm trong gói Supabase hiện có.
