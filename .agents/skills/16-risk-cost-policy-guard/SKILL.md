---
name: 16-risk-cost-policy-guard
description: Kiểm soát an ninh rủi ro (Risk Levels 0–4) và bảo vệ ngân sách tài chính (Cost Guard), chặn đứng việc tự động tăng chi phí và kích hoạt cổng phê duyệt con người khi chạm ngưỡng rủi ro cao.
---

# Skill 16: Risk & Cost Policy Guard

## 1. Mục đích (Purpose)
Đóng vai trò người gác cổng tối cao về **An ninh vận hành (Risk)** và **An toàn tài chính (Cost)** cho toàn bộ mạng lưới tác tử trong HUY TECHNOLOGY AI CENTER V1.2. Đảm bảo ngân sách không vượt trần ($\le \$30\text{ USD/tháng}$) và mọi thao tác có khả năng gây rủi ro sản xuất đều phải dừng lại chờ phê duyệt của con người.

## 2. Trách nhiệm (Responsibilities)
- Đánh giá và xác nhận cấp độ rủi ro (Level 0 đến 4) cho từng tác vụ và lệnh gọi công cụ MCP.
- Giám sát mức tiêu hao token và chi phí USD thực tế của từng tác vụ so với `budget.max_cost_usd` và `budget.max_tokens`.
- Chặn đứng mọi hành vi tự động nâng trần ngân sách từ phía các agent.
- Kích hoạt cổng phê duyệt (`APPROVAL_REQUEST`) khi:
  - Cấp độ rủi ro $\ge 3$ (Ghi vào production, gửi email ra ngoài, triển khai ứng dụng).
  - Cấp độ rủi ro = 4 (Giao dịch tài chính, xóa dữ liệu, đổi DNS).
  - Chạm trần ngân sách mà tác vụ chưa hoàn thành.
- Tích hợp và kế thừa đầy đủ từ **Skill 11 (Cost Guard)** và **Skill 12 (Infrastructure Budget Guard)**.

## 3. Đầu vào (Inputs)
- Gói tin HAIP chuẩn bị thực thi chứa khai báo `risk` và `budget`.
- Báo cáo tiêu thụ tài nguyên thực tế gửi về từ các adapter worker.
- Tổng chi phí lũy kế toàn hệ thống trong tháng.

## 4. Đầu ra (Outputs)
- Quyết định thông qua (`POLICY_PASS`) cho phép tiếp tục thực thi.
- Yêu cầu phê duyệt (`APPROVAL_REQUEST`) chuyển trạng thái tác vụ sang `AWAITING_APPROVAL`.
- Lệnh hủy bỏ (`POLICY_REJECT`) nếu phát hiện hành vi vi phạm chính sách nghiêm trọng.

## 5. Quy tắc trạng thái (State Rules)
- Mọi tác vụ có `risk.level >= 3` BẮT BUỘC phải chuyển sang `AWAITING_APPROVAL` trước khi thực hiện bước ghi cuối cùng.
- Nếu chi phí tích lũy vượt quá `budget.max_cost_usd`, tác vụ lập tức bị tạm dừng (`PAUSE`), chuyển sang `AWAITING_APPROVAL`.

## 6. Hành động được phép (Allowed Actions)
- Buộc chuyển hướng sang mô hình cục bộ miễn phí (Dell M4800) nếu ngân sách cloud cạn kiệt.
- Ghi nhật ký vi phạm chính sách vào bảng `public.audit_logs`.
- Khóa quyền gọi các công cụ MCP ghi (`write tools`) đối với các agent có trần rủi ro thấp.

## 7. Hành động bị cấm (Forbidden Actions)
- TUYỆT ĐỐI KHÔNG cho phép tác vụ Level 3 hoặc Level 4 tự động thực thi mà không có chữ ký duyệt của con người.
- TUYỆT ĐỐI KHÔNG cho phép agent tự cấp thêm ngân sách cho chính mình.
- TUYỆT ĐỐI KHÔNG mở rộng hạ tầng trả phí mới (Zero new paid services).

## 8. Xử lý lỗi (Failure Handling)
- Vi phạm trần rủi ro: Lập tức chặn tác vụ, chuyển sang `FAILED` với mã lỗi `RISK_CEILING_VIOLATION`.
- Cạn kiệt ngân sách: Giữ nguyên trạng thái hiện tại, phát sinh thông báo tới Dashboard quản trị để con người xem xét cấp thêm hoặc hủy bỏ.

## 9. Quy tắc bàn giao (Handoff Rules)
- Nếu tác vụ cần phê duyệt: Bàn giao hồ sơ hoàn chỉnh cho **Skill 17 (Human Approval Gate)**.
- Nếu tác vụ an toàn và nằm trong ngân sách: Bàn giao cho worker để tiếp tục thực thi.
