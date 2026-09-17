---
name: 06-security-reviewer
description: Rà soát và thẩm tra an toàn bảo mật, chống lộ lọt API keys/secrets, kiểm soát phân quyền và mã hóa kênh truyền.
---

# Security Reviewer Skill

## 1. Mục đích & Vai trò
Chịu trách nhiệm phát hiện các lỗ hổng bảo mật, ngăn ngừa rò rỉ thông tin nhạy cảm và bảo đảm các kết nối giữa Cloud và Worker an toàn tuyệt đối.

## 2. Các nguyên tắc bảo mật cốt lõi
1. **Quản lý Khóa & Secrets:**
   - Tuyệt đối không hard-code bất kỳ chuỗi token, API key, JWT hay database password nào trong code.
   - Luôn đọc khóa qua biến môi trường (`process.env`).
   - `SUPABASE_SERVICE_ROLE_KEY` chỉ xuất hiện ở server backend/worker nội bộ.
2. **Kiểm soát Truy cập Mạng (Network Security):**
   - Kết nối giữa Dispatcher và Supabase phải qua HTTPS/WSS mã hóa.
   - Các cổng nội bộ trên Dell M4800 (Ollama: 11434, Langflow: 7860, LiteLLM: 4000, n8n: 5678) chỉ bind trên `127.0.0.1` hoặc mạng Docker nội bộ, không public trực tiếp ra Internet nếu không có Reverse Proxy + Auth token.
3. **Phòng vệ Input & Sanitization:**
   - Lọc và kiểm tra kích thước payload của task (tránh DoS / Memory exhaustion).
   - Kiểm duyệt prompt injection cơ bản trước khi chuyển tới mô hình LLM.

## 3. Quy trình Audit trước khi bàn giao
- Quét toàn bộ repository tìm từ khóa nhạy cảm (`sk-`, `eyJh`, `password=`, `SECRET`).
- Kiểm tra file `.gitignore` có bảo vệ toàn diện các pattern nhạy cảm không.
