---
name: 17-human-approval-gate
description: Quản lý cổng phê duyệt con người, chuẩn bị hồ sơ tóm tắt điều hành, xử lý các quyết định phê duyệt/từ chối/yêu cầu sửa đổi và ngăn chặn việc làm phiền người dùng bằng các trao đổi nội bộ vụn vặt.
---

# Skill 17: Human Approval Gate

## 1. Mục đích (Purpose)
Đóng vai trò cầu nối tương tác chính giữa hệ thống tự trị đa tác tử và **Người vận hành con người (Human Operator)**. Giúp con người chỉ cần ra quyết định đối với các việc có rủi ro cao (Level 3-4), vượt ngân sách hoặc xuất bản sản phẩm cuối cùng mà không phải can thiệp vào các bước trung gian vụn vặt.

## 2. Trách nhiệm (Responsibilities)
- Thu thập và đóng gói dữ liệu thành **Hồ sơ phê duyệt điều hành (Executive Approval Package)**:
  - Bản tóm tắt mục tiêu và kết quả thực hiện bằng ngôn ngữ tự nhiên rõ ràng.
  - Bản xem trước sản phẩm đầu ra (Artifact Preview).
  - Bảng điểm và nhận xét của QA Reviewer.
  - Phân tích rủi ro và các cảnh báo an toàn.
  - Báo cáo chi phí tiêu thụ và số token đã dùng.
- Hiển thị trực quan trên giao diện ứng dụng web Control Center (`apps/control-center`).
- Tiếp nhận và xác thực 3 loại quyết định của con người:
  1. `APPROVE` (Chấp thuận thực thi / xuất bản)
  2. `REJECT` (Từ chối / Hủy bỏ tác vụ)
  3. `REQUEST_REVISION` (Yêu cầu chỉnh sửa kèm nhận xét)
- Chuyển tiếp các chỉ đạo phản hồi từ con người thành gói tin `CORRECTION` để worker sửa đổi.

## 3. Đầu vào (Inputs)
- Gói tin `APPROVAL_REQUEST` từ Dispatcher hoặc Risk Guard.
- Dữ liệu tham chiếu artifact từ `public.ai_outputs`.
- Kết quả kiểm định chất lượng từ `qa-reviewer`.

## 4. Đầu ra (Outputs)
- Cập nhật trạng thái tác vụ trong `public.ai_tasks`:
  - Nhận `APPROVE` $\rightarrow$ chuyển sang `APPROVED` $\rightarrow$ tiến hành `FINALIZING`.
  - Nhận `REJECT` $\rightarrow$ chuyển sang `CANCELLED`.
  - Nhận `REQUEST_REVISION` $\rightarrow$ chuyển sang `CORRECTING` $\rightarrow$ gửi lại worker.
- Bản ghi kiểm toán chi tiết có gắn định danh người duyệt trong `public.audit_logs`.

## 5. Quy tắc trạng thái (State Rules)
- Tác vụ phải nằm ở trạng thái `AWAITING_APPROVAL` trong suốt thời gian chờ phản hồi từ con người.
- Nếu quá thời hạn quy định (`expires_at`), tác vụ tự động hết hạn và chuyển sang `EXPIRED`, không bao giờ được tự động chuyển sang `APPROVED`.

## 6. Hành động được phép (Allowed Actions)
- Gửi thông báo đẩy / cờ hiệu đến thanh điều hướng của Control Center.
- Cung cấp tính năng so sánh dị biệt (diff viewer) khi người dùng yêu cầu sửa đổi nhiều lần.
- Ghi nhận nhận xét phản hồi dạng text từ người vận hành vào trường payload của bước sửa đổi.

## 7. Hành động bị cấm (Forbidden Actions)
- TUYỆT ĐỐI KHÔNG làm tràn ngập giao diện người dùng bằng các log trao đổi thô hoặc chuỗi suy luận nội bộ (chain-of-thought) của agent.
- TUYỆT ĐỐI KHÔNG tự động phê duyệt (auto-approve) bất kỳ tác vụ nào thuộc Risk Level $\ge 3$.
- TUYỆT ĐỐI KHÔNG cho phép người không có quyền quản trị (unauthenticated / non-admin) gửi quyết định phê duyệt.

## 8. Xử lý lỗi (Failure Handling)
- Hết hạn phê duyệt: Chuyển sang `EXPIRED`, giải phóng tài nguyên chiếm giữ, thông báo người dùng có thể kích hoạt lại nếu muốn.
- Người dùng từ chối: Hủy bỏ toàn bộ các nhánh tác vụ con liên đới trong DAG để tránh lãng phí năng lực tính toán.

## 9. Quy tắc bàn giao (Handoff Rules)
- Sau khi nhận `APPROVE`: Bàn giao cho **Finalizer** để thực hiện hành động ghi sản xuất hoặc đóng gói phát hành.
- Sau khi nhận `REQUEST_REVISION`: Bàn giao cho **Skill 18 (Autonomous QA & Recovery)** và Worker tương ứng để hoàn thiện lại.
