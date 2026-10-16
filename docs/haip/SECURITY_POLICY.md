# CHÍNH SÁCH BẢO MẬT & ZERO-TRUST GIAO THỨC HAIP/1.0
**Mã tài liệu:** HAIP-1.0-SEC-001  
**Thuộc chỉ thị:** HUY-HAIP-1.0-AG-001  
**Phạm vi áp dụng:** Toàn bộ 63 AI nhân sự, Node-01, Minh Khang AI Agency và các hệ thống vệ tinh.

---

## 1. NGUYÊN TẮC ZERO-TRUST & LEAST PRIVILEGE

1. **Không mặc định tin cậy:** Mọi thông điệp giữa các tác tử (Agent-to-Agent) đều phải được xác thực danh tính (`sender_id`), kiểm tra quyền hạn (`permissions`) và phạm vi dữ liệu (`scope`).
2. **Chặn ghi mặc định (Deny-by-Default):** Các tác tử chỉ có quyền đọc (`READ_ONLY`) tài nguyên dự án và workspace trừ khi được cấp quyền ghi (`WRITE_ALLOWLIST`) rõ ràng cho từng subtask cụ thể.
3. **Phân vùng cách ly Workspace:**
   - Mỗi phòng ban (`dept_01` đến `dept_08`) chỉ có quyền ghi trong thư mục workspace riêng của phòng ban: `/mnt/data1/HUY-AI/workspaces/departments/dept_XX/`.
   - Workspace của phòng ban khác chỉ được cấp quyền đọc khi có thỏa thuận `HANDOFF` hợp lệ.

---

## 2. RÀNG BUỘC CÁCH LY CHẾ ĐỘ PLAN_ONLY (ĐẶC THÙ SMARTTAX)

1. **Ranh giới bất khả xâm phạm:**
   - Dự án `SmartTax AI` (`https://smarttax-ai.vercel.app/` và repo `/mnt/data1/Projects/smarttax-ai`) được chỉ định nghiêm ngặt ở chế độ **`PLAN_ONLY`**.
   - Cấm mọi hành vi: `git push`, sửa đổi source code, can thiệp build pipeline, thay đổi cấu hình môi trường Vercel hoặc cơ sở dữ liệu production của SmartTax AI.
2. **Quyền hạn cho phép đối với SmartTax:**
   - Đọc cấu trúc thư mục, `package.json`, danh mục views, backend services và git commit hiện tại để thu thập ngữ cảnh kỹ thuật.
   - Phân tích nghiệp vụ thuế, kiến trúc A2A, đề xuất tài liệu kế hoạch, thiết kế lộ trình (Roadmap).
   - Bất kỳ cố gắng ghi nào vào thư mục `/mnt/data1/Projects/smarttax-ai` sẽ bị **Policy Engine chặn đứng ngay lập tức với mã lỗi `SEC_E001_WRITE_TO_PLAN_ONLY_TARGET_DENIED`**.

---

## 3. CÁC CỔNG PHÊ DUYỆT CỦA CON NGƯỜI (HUMAN GOVERNANCE GATES)

Các hành vi sau đây **bắt buộc dừng lại và chuyển trạng thái sang `AWAITING_OWNER_APPROVAL`**:
- **Cổng R0 (Chi phí & Ngân sách):** Kêu gọi các mô hình Cloud trả phí vượt quota hoặc phát sinh chi phí hạ tầng mới.
- **Cổng R1 (Bảo mật & Bí mật):** Thao tác sửa đổi, đọc thô hoặc xoay vòng các API keys, SSH keys, Token quản trị.
- **Cổng R2 (Toàn vẹn Dữ liệu Sản xuất):** Thao tác drop table, truncate, force reset cơ sở dữ liệu PostgreSQL / Supabase / SQLite sản xuất.
- **Cổng R3 (Phát hành Mạng diện rộng):** Mở port mới ra Internet hoặc triển khai ứng dụng tới môi trường public.
- **Cổng R4 (Can thiệp Repo ngoài danh mục):** Commit hoặc push mã nguồn vào các repository không thuộc danh mục cho phép trong chỉ thị.

---

## 4. MA TRẬN PHÂN QUYỀN 8 KHỐI NGHIỆP VỤ (RBAC MATRIX)

| Khối Nghiệp Vụ | Bộ Skill & Tool Được Phép | Quyền Đọc | Quyền Ghi | Giới Hạn Mô Hình |
| :--- | :--- | :--- | :--- | :--- |
| **BU1: Điều hành** | `build_strategy_dag`, `orchestrate_task`, `approve_handoff` | Toàn hệ sinh thái | `dept_01` workspace | `qwen3:4b` |
| **BU2: R&D AI** | `research_models`, `eval_benchmarks`, `prompt_engineer` | Skills, Datasets | `dept_02` workspace | `qwen2.5-coder:7b` |
| **BU3: Sản phẩm** | `analyze_ui_ux`, `spec_features`, `review_flow` | Frontend source, Docs | `dept_03` workspace | `qwen3:4b` |
| **BU4: Hạ tầng & SRE** | `audit_repo_context`, `inspect_logs`, `check_health` | Codebase, Configs | `dept_04` workspace | `qwen2.5-coder:7b` |
| **BU5: Tài chính** | `audit_tax_compliance`, `cost_analysis`, `ledger_review` | Financial specs, Regs | `dept_05` workspace | `qwen3:4b` |
| **BU6: Marketing** | `content_strategy`, `seo_audit`, `growth_metrics` | Marketing assets | `dept_06` workspace | `qwen3:4b` |
| **BU7: Kiểm toán & QA** | `verify_artifacts`, `test_gates`, `security_scan` | Toàn bộ artifacts | `dept_07` workspace | `qwen2.5-coder:7b` |
| **BU8: Vận hành** | `incident_report`, `support_dispatch`, `sop_lookup` | Logs, Incident queue | `dept_08` workspace | `qwen3:4b` / `smollm2` |

---

## 5. CƠ CHẾ CHỐNG PHÁT LẠI & TOÀN VẸN THÔNG ĐIỆP (ANTI-REPLAY & AUDIT)

- Mọi gói tin HAIP Envelope chứa `message_id` duy nhất và timestamp chuẩn ISO-8601 UTC.
- Các tin nhắn có độ lệch thời gian > 300 giây hoặc `message_id` đã từng được xử lý trong Event Store sẽ bị loại bỏ lập tức (`IDEMPOTENT_IGNORE`).
- Mỗi bản ghi nhật ký (Audit Log) đều được ký băm SHA-256 chuỗi liên kết (Hash Chain), bảo đảm tính bất biến chống can thiệp lịch sử.
