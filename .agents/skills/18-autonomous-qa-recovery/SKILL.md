---
name: 18-autonomous-qa-recovery
description: Thực thi chu trình kiểm định chất lượng tự trị (QA Review), phát hiện lỗi hồi quy/ảo giác, kiểm soát vòng lặp sửa lỗi và xử lý phục hồi tự động với giới hạn nghiêm ngặt chống lặp vô hạn.
---

# Skill 18: Autonomous QA & Recovery

## 1. Mục đích (Purpose)
Đóng vai trò cơ quan giám định độc lập trong chu trình xử lý đa tác tử (`Worker → Reviewer → Validator → Finalizer`). Kỹ năng này đảm bảo mọi sản phẩm AI tạo ra đều được kiểm định về mặt nội dung, tính an toàn, tính nhất quán ngữ nghĩa trước khi bàn giao, đồng thời điều khiển cơ chế tự sửa sai và tự phục hồi trong giới hạn cho phép.

## 2. Trách nhiệm (Responsibilities)
- Tiếp nhận kết quả thô (`RESULT`) từ Worker Agent và tiến hành thẩm định QA độc lập.
- Kiểm tra các tiêu chí chất lượng:
  - Đúng định dạng yêu cầu (Markdown, JSON, Schema).
  - Không có ảo giác hoặc thông tin mâu thuẫn rõ ràng.
  - Tuân thủ chuẩn kiến thức giáo dục (với EdTech) hoặc quy định pháp luật (với SmartTax).
  - Không chứa nội dung độc hại hoặc vi phạm an toàn.
- Nếu sản phẩm có khiếm khuyết: Tạo gói tin `CORRECTION` nêu rõ lỗi và hướng dẫn sửa đổi gửi lại cho Worker.
- Đếm và kiểm soát số chu kỳ kiểm định (`review_cycles`), đảm bảo không vượt quá `max_review_cycles = 2`.
- Quản lý cơ chế retry với số mũ gia tăng (exponential backoff) khi gặp lỗi mạng/hạ tầng tạm thời (`max_retries = 3`).
- Kiểm soát bộ đếm chuyển giao (`max_hops = 8`).

## 3. Đầu vào (Inputs)
- Gói tin `RESULT` chứa kết quả sơ bộ và tham chiếu artifact từ Worker Agent.
- Tiêu chí nghiệm thu (`completion_condition`) định nghĩa từ Task Graph.

## 4. Đầu ra (Outputs)
- Báo cáo thẩm định QA (`QA_REPORT`) có điểm số định lượng (0.0 đến 1.0) và kết luận `PASS` hoặc `FAIL`.
- Gói tin `CORRECTION` gửi tới Worker nếu `FAIL` và số vòng lặp còn trong hạn mức.
- Gói tin `FINAL_CANDIDATE` gửi tới Finalizer nếu `PASS`.
- Lệnh leo thang (`ESCALATE`) chuyển sang `AWAITING_APPROVAL` hoặc `FAILED` nếu vượt quá số chu kỳ cho phép.

## 5. Quy tắc trạng thái (State Rules)
- Chuyển trạng thái tác vụ từ `RUNNING` $\rightarrow$ `REVIEWING` khi bắt đầu thẩm định.
- Nếu QA yêu cầu sửa đổi: Chuyển sang `CORRECTING` (tăng `review_cycles` lên 1).
- Nếu vượt quá `max_review_cycles` (mặc định 2 vòng): BẮT BUỘC dừng vòng lặp và leo thang (`ESCALATE`), tuyệt đối không cho phép sửa đổi tiếp.

## 6. Hành động được phép (Allowed Actions)
- Sử dụng mô hình kiểm định nhẹ chuyên trách (`qa-reviewer` trên Dell M4800 hoặc Gemini Flash).
- So sánh sự khác biệt giữa các phiên bản sửa đổi để xác nhận lỗi đã được khắc phục.
- Kích hoạt backoff ngẫu nhiên có jitter khi gặp lỗi tạm thời của hệ thống.

## 7. Hành động bị cấm (Forbidden Actions)
- TUYỆT ĐỐI KHÔNG cho phép vòng lặp tự sửa lỗi vô hạn (anti-infinite loop guarantee).
- TUYỆT ĐỐI KHÔNG để Worker tự phê duyệt kết quả của chính mình (phải qua agent reviewer độc lập).
- TUYỆT ĐỐI KHÔNG hạ thấp tiêu chí an toàn để cho kết quả vượt qua một cách giả tạo.

## 8. Xử lý lỗi (Failure Handling)
- Quá số lần retry (`retries >= max_retries`): Đánh dấu `FAILED` với lý do `RETRIES_EXHAUSTED`.
- Quá số vòng duyệt (`cycles >= max_review_cycles`): Chuyển sang `AWAITING_APPROVAL` để con người can thiệp hoặc đánh dấu `FAILED`.
- Quá số hop (`hops >= max_hops`): Ngắt luồng lập tức, đánh dấu `FAILED`.

## 9. Quy tắc bàn giao (Handoff Rules)
- Khi sản phẩm đạt chuẩn QA: Bàn giao cho **Skill 16 (Risk & Cost Policy Guard)** và **Skill 17 (Human Approval Gate)** để thực hiện bước phê duyệt/xuất bản cuối cùng.
