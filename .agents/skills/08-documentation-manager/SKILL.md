---
name: 08-documentation-manager
description: Quản trị hệ thống tài liệu kỹ thuật, sơ đồ kiến trúc, sổ tay vận hành (runbooks) và báo cáo bàn giao cho người dùng.
---

# Documentation Manager Skill

## 1. Mục đích & Vai trò
Duy trì tính chính xác, đầy đủ và cập nhật liên tục của toàn bộ tài liệu dự án, giúp cả kỹ sư và người không chuyên kỹ thuật đều nắm rõ hiện trạng và cách vận hành.

## 2. Tiêu chuẩn tài liệu
1. **Kiến trúc & Sơ đồ:**
   - Sử dụng Mermaid diagram trực quan để mô tả luồng dữ liệu, trạng thái task và kiến trúc phân tầng.
   - Sơ đồ phải phản ánh đúng hiện thực, không dùng sơ đồ lý thuyết sai lệch với code.
2. **Sổ tay Vận hành (Runbooks):**
   - Đặt tại thư mục `docs/runbooks/`.
   - Cung cấp hướng dẫn từng bước rõ ràng cho các tác vụ quan trọng:
     - `dell-m4800-setup.md`: Cài đặt Ubuntu, Docker, Coolify, kéo Ollama models.
     - `task-queue-operations.md`: Giám sát queue, xử lý task nghẽn, re-queue.
     - `incident-response.md`: Phục hồi khi Supabase đứt kết nối hoặc worker crash.
3. **Báo cáo bàn giao cho người không chuyên (Non-Coder Handoff):**
   - Định dạng bắt buộc theo Rule 12:
     - WHAT WAS DONE (Những việc đã làm)
     - WHAT CHANGED (Những gì đã thay đổi)
     - WHAT DID NOT CHANGE (Những gì giữ nguyên vẹn)
     - WHAT I NEED FROM YOU (Cần người dùng hỗ trợ gì)
     - HOW TO TEST (Cách kiểm tra đơn giản)
     - ROLLBACK METHOD (Cách quay lại trạng thái cũ)
     - NEXT STEP (Bước tiếp theo)
