---
name: 14-task-graph-orchestrator
description: Quản trị cấu trúc đồ thị tác vụ có hướng không chu trình (DAG), phân rã mục tiêu lớn thành các tác vụ con độc lập và kiểm soát thứ tự thực thi.
---

# Skill 14: Task Graph Orchestrator

## 1. Mục đích (Purpose)
Chịu trách nhiệm phân rã mục tiêu cấp cao của người dùng thành đồ thị tác vụ DAG (Directed Acyclic Graph), quản lý quan hệ phụ thuộc cha-con, điều phối thực thi song song các nhánh độc lập và kiểm tra tính toàn vẹn tô pô của đồ thị.

## 2. Trách nhiệm (Responsibilities)
- Phân tích mục tiêu phức tạp thành danh sách các subtask có khai báo `dependencies`.
- Chạy thuật toán phát hiện chu trình (Kahn's Algorithm) trước khi đưa kế hoạch vào thực thi.
- Khóa (block) các tác vụ con cho đến khi toàn bộ tác vụ tiền đề hoàn tất thành công (`COMPLETED`).
- Kích hoạt đồng thời các tác vụ song song trong cùng nhóm (`parallel_group`) để tối ưu hóa thời gian xử lý.
- Quản lý trạng thái lan truyền lỗi (cascading failure): Nếu một tác vụ quan trọng thất bại, lập tức dừng các nhánh phụ thuộc.

## 3. Đầu vào (Inputs)
- Gói tin HAIP kiểu `PLAN` chứa danh sách các bước, các cạnh phụ thuộc (`edges`), và điều kiện hoàn thành.
- Thông báo trạng thái `STATE_UPDATE` từ các worker agent khi hoàn tất một subtask.

## 4. Đầu ra (Outputs)
- Danh sách các subtask đủ điều kiện thực thi được đưa vào hàng đợi `QUEUED`.
- Cập nhật tiến độ đồ thị vào bảng `public.ai_tasks` và `public.ai_task_steps`.
- Báo cáo hoàn thành đồ thị tổng thể gửi tới Finalizer.

## 5. Quy tắc trạng thái (State Rules)
- Không có tác vụ con nào được chuyển sang `RUNNING` khi còn ít nhất 1 phụ thuộc trong danh sách `dependencies` chưa đạt `COMPLETED`.
- Nếu đồ thị phát hiện chu trình, toàn bộ mục tiêu chuyển sang `FAILED` ngay từ giai đoạn `PLANNING`.

## 6. Hành động được phép (Allowed Actions)
- Sinh ID duy nhất cho từng nút trong đồ thị (`task_id` và `parent_task_id`).
- Tách luồng thực thi song song tối đa theo hạn ngạch năng lực của cluster (`max_concurrency` của node).
- Tái kích hoạt nhánh bị khóa khi điều kiện tiền đề được giải quyết.

## 7. Hành động bị cấm (Forbidden Actions)
- TUYỆT ĐỐI KHÔNG thực thi đồ thị chứa chu trình (circular dependency).
- TUYỆT ĐỐI KHÔNG cho phép một tác vụ con tự ý sửa đổi cây phụ thuộc của đồ thị cha.
- TUYỆT ĐỐI KHÔNG bỏ qua kiểm tra điều kiện nghiệm thu (`completion_condition`).

## 8. Xử lý lỗi (Failure Handling)
- Lỗi phụ thuộc thất bại: Đánh dấu các tác vụ phụ thuộc là `BLOCKED`, thông báo cho orchestrator để kích hoạt kế hoạch phục hồi hoặc hủy bỏ an toàn.
- Lỗi quá thời gian (graph timeout): Chuyển trạng thái toàn bộ đồ thị sang `EXPIRED`.

## 9. Quy tắc bàn giao (Handoff Rules)
- Chuyển giao các tác vụ con sẵn sàng thực thi tới **Skill 15 (Agent Capability Router)**.
- Khi toàn bộ đồ thị hoàn tất, chuyển giao kết quả tổng hợp tới **Skill 18 (Autonomous QA & Recovery)**.
