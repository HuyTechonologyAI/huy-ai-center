---
name: 15-agent-capability-router
description: Định tuyến tác vụ thông minh dựa trên danh bạ Agent Card, đối chiếu năng lực (capability matching), kiểm tra trạng thái sức khỏe và lựa chọn mô hình/môi trường tối ưu chi phí.
---

# Skill 15: Agent Capability Router

## 1. Mục đích (Purpose)
Chịu trách nhiệm ghép nối tác vụ HAIP với agent phù hợp nhất dựa trên **Năng lực (Capabilities)** thay vì gán cứng nhà cung cấp LLM. Đảm bảo quy tắc ưu tiên tính toán nội bộ (Dell Precision M4800) và kiểm tra hạn ngạch rủi ro trước khi ủy quyền.

## 2. Trách nhiệm (Responsibilities)
- Đọc và tra cứu Agent Cards từ bộ nhớ cache hoặc bảng `public.agents` / `public.agent_versions`.
- Đối chiếu danh sách `required_capabilities` của tác vụ với `capabilities` của các agent đang hoạt động (`health_status == 'healthy'`).
- Kiểm tra trần rủi ro: Đảm bảo `task.risk.level <= agent.risk_ceiling`.
- Kiểm tra dung lượng tải song song: Đảm bảo `current_load < agent.max_parallel_tasks`.
- Lựa chọn mô hình theo bậc thang chi phí (Tier 0 nội bộ $\rightarrow$ Tier 1 miễn phí $\rightarrow$ Tier 2 giá thấp $\rightarrow$ Tier 3 cao cấp có kiểm soát).

## 3. Đầu vào (Inputs)
- Gói tin HAIP kiểu `TASK` hoặc `DELEGATE` chứa yêu cầu năng lực, giới hạn ngân sách và cấp độ rủi ro.
- Trạng thái sức khỏe và tải hiện thời của các node tính toán (`public.nodes`).

## 4. Đầu ra (Outputs)
- Gói tin HAIP kiểu `CLAIM` hoặc `DELEGATE` gán rõ `recipient.id` là agent được lựa chọn.
- Bản ghi ánh xạ thực thi gồm: Agent ID, target compute node, danh sách MCP tools được cấp phép, và mô hình thực thi chỉ định.

## 5. Quy tắc trạng thái (State Rules)
- Không định tuyến tới bất kỳ agent nào có `health_status != 'healthy'`.
- Nếu tất cả agent phù hợp đang đầy tải, tác vụ phải giữ nguyên trạng thái `QUEUED` chờ lượt xử lý.

## 6. Hành động được phép (Allowed Actions)
- Lựa chọn fallback model theo chuỗi ưu tiên đã định nghĩa trong Agent Card.
- Tự động hạ cấp sang mô hình nhỏ hơn (SLM) nếu ngân sách tác vụ bị giới hạn ngặt nghèo.
- Truy vấn nhịp tim của máy chủ Dell (`node_heartbeats`) để đánh giá độ trễ trước khi phân bổ việc nặng.

## 7. Hành động bị cấm (Forbidden Actions)
- TUYỆT ĐỐI KHÔNG định tuyến công việc gán cứng tên thương hiệu LLM khi chưa đối soát năng lực.
- TUYỆT ĐỐI KHÔNG vượt qua mức trần rủi ro (`risk_ceiling`) của agent.
- TUYỆT ĐỐI KHÔNG gán việc vượt quá `max_parallel_tasks` của instance agent.

## 8. Xử lý lỗi (Failure Handling)
- Không tìm thấy agent có đủ năng lực: Trả về `ERROR: NO_CAPABLE_AGENT_FOUND`, ghi log chi tiết năng lực còn thiếu.
- Node tính toán mất kết nối giữa chừng: Tự động thu hồi claim và đưa tác vụ về `QUEUED` để điều hướng sang node dự phòng.

## 9. Quy tắc bàn giao (Handoff Rules)
- Chuyển giao thông tin định tuyến cho **Skill 16 (Risk & Cost Policy Guard)** để kiểm duyệt tài chính và an ninh trước khi thực sự khởi chạy.
