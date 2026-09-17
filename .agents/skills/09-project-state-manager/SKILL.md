---
name: 09-project-state-manager
description: Quản trị và cập nhật tập trung file PROJECT_STATE.md, chống mất mát ngữ cảnh và bảo đảm trạng thái dự án minh bạch.
---

# Project State Manager Skill

## 1. Mục đích & Vai trò
Đảm bảo trạng thái của toàn bộ dự án `huy-ai-center` được ghi nhận chính xác, đầy đủ và bền vững trong file `PROJECT_STATE.md` sau mỗi milestone hoặc thay đổi quan trọng, không bao giờ để ngữ cảnh chỉ tồn tại trong bộ nhớ tạm thời của LLM.

## 2. Cấu trúc bắt buộc của `PROJECT_STATE.md`
Mỗi lần cập nhật phải tuân thủ đủ các mục:
- `PROJECT`: Tên dự án và tóm tắt ngắn gọn.
- `CURRENT_PHASE`: Phase hiện tại và trạng thái (`IN_PROGRESS`, `DONE`, `PARTIAL`).
- `CURRENT_BRANCH`: Nhánh git đang làm việc.
- `COMPLETED`: Danh sách các mục đã hoàn tất kèm checkbox `[x]`.
- `IN_PROGRESS`: Các mục đang xử lý `[ ]`.
- `PENDING`: Các mục đang chờ theo lộ trình.
- `DATABASE_STATE`: Hiện trạng DB (Production vs Dev/Staging, Migration status).
- `API_STATE`: Hiện trạng API, contracts và endpoints.
- `FRONTEND_STATE`: Hiện trạng mã nguồn ứng dụng web.
- `WORKER_STATE`: Hiện trạng Dispatcher worker và node Dell M4800.
- `TEST_STATUS`: Kết quả chạy tests (pass/fail, coverage).
- `KNOWN_ISSUES`: Các lỗi đã biết hoặc điểm hạn chế cần lưu ý.
- `DECISIONS`: Các quyết định kiến trúc đã đưa ra và lý do.
- `NEXT_ACTION`: Hành động cụ thể tiếp theo.

## 3. Quy tắc cập nhật
- Cập nhật ngay khi kết thúc một phase hoặc khi chuyển trạng thái nhiệm vụ.
- Nếu phase chưa đạt đủ tiêu chuẩn kiểm thử: đánh dấu `PARTIAL`, tuyệt đối không ghi `DONE`.
