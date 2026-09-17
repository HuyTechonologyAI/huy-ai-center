---
name: 07-test-and-qa
description: Quản lý quy chuẩn kiểm thử, viết và thực thi Unit test, Integration test cho hàng đợi Task Queue và các adapter AI.
---

# Test and QA Skill

## 1. Mục đích & Vai trò
Đảm bảo chất lượng toàn diện của phần mềm trung tâm, ngăn chặn lỗi hồi quy (regression) và bảo đảm các tình huống biên (edge cases) được kiểm tra kỹ lưỡng trước khi triển khai.

## 2. Chiến lược kiểm thử (Testing Pyramid)
1. **Unit Tests (Packages & Adapters):**
   - Kiểm thử tính đúng đắn của Zod validation trong `packages/contracts`.
   - Kiểm thử formatters, exponential backoff retry logic trong `packages/shared`.
   - Mock các phản hồi từ AI Services (Ollama, LiteLLM, Langflow) để test Adapter độc lập không cần máy chủ thật.
2. **Integration Tests (Task Queue & State Machine):**
   - Kiểm tra chu trình chuyển trạng thái: `queued` → `claimed` → `running` → `completed`.
   - Kiểm tra xử lý lỗi khi worker gặp crash: task chuyển thành `failed` hoặc tự động timeout sau thời gian định trước.
   - Kiểm tra khả năng xử lý concurrency: 2 worker cùng claim 1 task không xảy ra race condition (Optimistic Concurrency / Row lock).
3. **Typecheck & Linting:**
   - `npm run typecheck` phải đạt 0 lỗi trên toàn bộ monorepo.
   - `npm run lint` tuân thủ nghiêm ngặt quy chuẩn TypeScript.

## 3. Tiêu chí đánh dấu Hoàn thành (Definition of Done)
- 100% tests mới và cũ đều PASS.
- Không có cảnh báo lints nghiêm trọng (0 errors).
- Build thành công không có lỗi runtime tiềm ẩn.
