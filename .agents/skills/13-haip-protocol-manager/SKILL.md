---
name: 13-haip-protocol-manager
description: Quản lý tính toàn vẹn, xác thực lược đồ và chuẩn hóa giao thức HAIP/1.0 (Huy AI Inter-Agent Protocol) trong hệ thống điều phối đa tác tử.
---

# Skill 13: HAIP Protocol Manager

## 1. Mục đích (Purpose)
Đảm bảo 100% thông điệp trao đổi giữa các agent, bộ lập kế hoạch, bộ điều phối và các công cụ trong HUY TECHNOLOGY AI CENTER tuân thủ nghiêm ngặt tiêu chuẩn **HAIP/1.0**. Ngăn chặn mọi trường hợp tự ý phát minh cấu trúc thông điệp không tương thích.

## 2. Trách nhiệm (Responsibilities)
- Xác thực cú pháp và ngữ nghĩa của tất cả các gói tin dựa trên `schemas/haip/haip-envelope.v1.schema.json`.
- Kiểm tra tính hợp lệ của đúng 12 kiểu thông điệp chuẩn (`TASK`, `PLAN`, `CLAIM`, `DELEGATE`, `TOOL_CALL`, `RESULT`, `REVIEW`, `CORRECTION`, `STATE_UPDATE`, `ERROR`, `FINAL_CANDIDATE`, `APPROVAL_REQUEST`).
- Quản lý phiên bản giao thức (`haip_version: "HAIP/1.0"`).
- Kiểm soát và tăng bộ đếm hop (`trace.hop`) để chống lặp vô hạn.
- Đóng gói dữ liệu đầu ra thành các tham chiếu artifact (`artifact_ref`) thay vì đính kèm tệp nhị phân lớn.

## 3. Đầu vào (Inputs)
- Chuỗi JSON hoặc đối tượng thông điệp inter-agent gửi qua Supabase PGMQ (`ai-jobs`) hoặc HTTP nội bộ.
- Thông tin định danh người gửi (`sender`), người nhận (`recipient`), ý định (`intent`), và độ ưu tiên (`priority`).

## 4. Đầu ra (Outputs)
- Gói tin HAIP Envelope hợp lệ, đã được ký số / kiểm tra hash và đóng dấu thời gian ISO 8601 UTC.
- Thông báo lỗi cấu trúc (`ERROR: INVALID_HAIP_ENVELOPE`) nếu dữ liệu đầu vào không hợp lệ.

## 5. Quy tắc trạng thái (State Rules)
- Mọi gói tin khởi tạo phải có `trace.hop = 0`.
- Mỗi lần ủy quyền (`DELEGATE`), `trace.hop` phải tăng lên 1 đơn vị. Nếu `trace.hop > 8`, gói tin bị hủy lập tức.

## 6. Hành động được phép (Allowed Actions)
- Xác thực schema bằng Zod hoặc AJV Draft 2020-12.
- Thêm trường `trace.route_history` để phục vụ giám sát và kiểm toán.
- Từ chối tiếp nhận các thông điệp có `haip_version` không tương thích.

## 7. Hành động bị cấm (Forbidden Actions)
- TUYỆT ĐỐI KHÔNG cho phép truyền nội dung tệp nhị phân (> 32KB) trực tiếp trong trường payload.
- TUYỆT ĐỐI KHÔNG chấp nhận các kiểu message nằm ngoài 12 kiểu chuẩn.
- TUYỆT ĐỐI KHÔNG bỏ qua việc kiểm tra trường `risk` và `budget`.

## 8. Xử lý lỗi (Failure Handling)
- Gói tin sai cấu trúc: Đưa vào trạng thái `FAILED`, ghi log cảnh báo chi tiết vào `public.audit_logs.details`.
- Message hết hạn (`expires_at < now()`): Đánh dấu `EXPIRED` và loại bỏ khỏi hàng đợi xử lý.

## 9. Quy tắc bàn giao (Handoff Rules)
- Sau khi xác thực hợp lệ, chuyển giao cho **Skill 14 (Task Graph Orchestrator)** hoặc **Skill 15 (Agent Capability Router)** để điều phối thực thi.
