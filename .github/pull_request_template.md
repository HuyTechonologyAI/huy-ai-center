## 1. Mô tả Thay đổi (Scope of Change)
<!-- Tóm tắt mục tiêu, bối cảnh và các file thay đổi chính -->
- **Loại thay đổi:** [ ] feat [ ] fix [ ] docs [ ] security [ ] refactor [ ] test
- **Mức độ rủi ro (Risk Level):** [ ] Risk 1 (Thấp) [ ] Risk 2 (Trung bình) [ ] Risk 3 (Cao - Cần duyệt) [ ] Risk 4 (Nghiêm trọng - Cần Owner duyệt)
- **Tham chiếu (Issue / Task ID):**

---

## 2. Kiểm thử & Xác thực Kỹ thuật (Verification Checklist)
- [ ] **Local Tests:** `npm test` đã chạy và vượt qua 100%.
- [ ] **Typecheck:** `npx tsc --noEmit` đạt 0 lỗi.
- [ ] **Build:** `npm run build` biên dịch thành công 100% routes.
- [ ] **Preview Deployment:** Đã kiểm tra thực tế trên Vercel Preview URL: `____________________`
- [ ] **Ảnh chụp minh chứng (UI Screenshots):** Đã đính kèm ảnh đối soát nếu có thay đổi giao diện.

---

## 3. Quản trị & Tuân thủ Hệ thống (Governance & Invariants)
- [ ] **Thay đổi Database / Supabase Schema:**
  - [ ] **KHÔNG CÓ (Mặc định - ZERO DB Changes)**
  - [ ] Có (Yêu cầu văn bản phê duyệt kiến trúc riêng biệt)
- [ ] **Thay đổi Biến môi trường (Environment Variables):**
  - [ ] **KHÔNG CÓ (Mặc định)**
  - [ ] Có (Đã cấu hình an toàn trên Vercel / không lộ secret)
- [ ] **Tác động Bảo mật (Security Impact):** Không phơi bày API keys, hạ tầng nội bộ, thông tin nhạy cảm.
- [ ] **Tác động SEO (SEO Impact):** Đảm bảo thẻ Canonical, Robots, Meta, Sitemap không bị xung đột.
- [ ] **Kế hoạch Phục hồi (Rollback Plan):** Đã xác định deployment ID hoặc commit rollback nếu có sự cố.

---

## 4. Phê duyệt của Con người (Human Sign-Off)
- [ ] **Đã được Người vận hành / Repository Owner kiểm tra và phê duyệt trước khi Merge vào `main`.**
<!-- Lưu ý: AI Agent TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ ĐỘNG MERGE VÀO MAIN -->
