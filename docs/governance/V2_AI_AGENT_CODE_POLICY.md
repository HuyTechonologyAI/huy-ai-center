# CHÍNH SÁCH RANH GIỚI THAO TÁC CỦA TÁC TỬ AI (V2 AI AGENT CODE POLICY)

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Đối tượng áp dụng:** Mọi Tác tử AI (AI Coding Agents / Subagents / Autonomous Workers)  
**Nguyên tắc cốt lõi:** **TỪ CHỐI MẶC ĐỊNH (DEFAULT DENY) — CON NGƯỜI LÀ TRỌNG TÂM DUYỆT (HUMAN-IN-THE-LOOP)**

---

## 1. DANH MỤC HÀNH ĐỘNG CẤM TUYỆT ĐỐI (MUST NOT)

Các tác tử AI trong tương lai **TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP**:
1. **Đẩy mã nguồn trực tiếp vào nhánh `main` (Push directly to `main`):** Toàn bộ mã nguồn phải qua nhánh tính năng và Pull Request.
2. **Thực hiện đẩy cưỡng bức (Force push):** Nghiêm cấm mọi hình thức `--force` hoặc xóa lịch sử commit trên bất kỳ nhánh nào.
3. **Tự động sáp nhập Pull Request của chính mình (Self-merge PR):** Tác tử AI không có thẩm quyền tự phê duyệt hoặc tự merge PR do chính mình tạo ra.
4. **Thay đổi quy tắc bảo vệ nhánh (Alter branch protection rules):** Không được tự ý tắt, giảm bớt hoặc can thiệp vào Branch Protection Rules.
5. **Chỉnh sửa hoặc trích xuất mã bí mật sản xuất (Modify/Expose production secrets):** Không ghi đè, hiển thị hoặc truyền các biến môi trường nhạy cảm (`SUPABASE_SERVICE_ROLE_KEY`, private tokens).
6. **Tự động triển khai lên môi trường Production (Deploy production autonomously):** Không kích hoạt thăng cấp sản xuất khi chưa có lệnh phê duyệt rõ ràng từ con người.
7. **Tự phê duyệt các thay đổi cấp độ Risk 3 và Risk 4:** Mọi thay đổi chạm đến API ghi dữ liệu, phân quyền xác thực, hạ tầng cơ sở dữ liệu đều cần con người ký duyệt.

---

## 2. DANH MỤC HÀNH ĐỘNG ĐƯỢC PHÉP (MAY)

Các tác tử AI **ĐƯỢC PHÉP VÀ KHUYẾN KHÍCH THỰC HIỆN**:
1. **Tạo nhánh tính năng mới (Create feature branches):** Khởi tạo các nhánh theo quy chuẩn `feat/...`, `fix/...`, `docs/...`.
2. **Chỉnh sửa và hoàn thiện mã nguồn trong phạm vi được giao (Edit code within assigned scope):** Thực hiện đúng theo chỉ đạo của bài toán/giai đoạn.
3. **Chạy các công cụ kiểm thử tự động (Run tests):** Chạy `npm test`, `npx tsc --noEmit`, kiểm thử hồi quy và ghi nhận kết quả.
4. **Tạo commit có cấu trúc chuẩn mực (Create semantic commits):** Đặt thông điệp commit rõ ràng, có phạm vi và mã tham chiếu.
5. **Khởi tạo Bản nháp Pull Request (Open Draft PRs):** Điền đầy đủ PR Template, đính kèm checklist kiểm thử và bằng chứng hình ảnh.
6. **Soạn thảo tài liệu và ghi chú phát hành (Generate release notes):** Viết báo cáo giai đoạn, tóm tắt kỹ thuật, kế hoạch rollback.
7. **Yêu cầu con người đánh giá và phê duyệt (Request human review):** Đặt câu hỏi, xin ý kiến phản hồi và dừng lại chờ chấp thuận.

---

## 3. PHÂN CẤP RỦI RO THAY ĐỔI MÃ NGUỒN (CHANGE RISK CLASSIFICATION)

| Cấp độ | Định danh | Phạm vi Thay đổi Điển hình | Yêu cầu Phê duyệt & Kiểm soát |
| :--- | :--- | :--- | :--- |
| **LOW** | Rủi ro Thấp | Chỉnh sửa nội dung văn bản (copy), tinh chỉnh giao diện nhỏ (visual polish), cập nhật tài liệu kỹ thuật không ảnh hưởng runtime. | AI Agent tự động chạy test cục bộ; Review tiêu chuẩn. |
| **MEDIUM**| Rủi ro Trung bình | Thêm logic giao diện mới, bổ sung route công khai mới, điều chỉnh thư viện phụ thuộc, tái cấu trúc component. | Bắt buộc kiểm thử build tĩnh 100%; Kiểm tra thực tế trên Vercel Preview; 1 phê duyệt từ Reviewer. |
| **HIGH** | Rủi ro Cao | Ghi dữ liệu vào production API, thay đổi luồng xác thực (auth), sửa logic contact form backend, cấu hình biến môi trường, sửa đổi security headers. | **Risk 3:** Bắt buộc Preview validation, đối soát zero-leak, kế hoạch rollback chi tiết, Người vận hành phê duyệt. |
| **CRITICAL**| Nguy cơ Trọng yếu | Thay đổi bản ghi DNS, xoay vòng credentials bí mật, chạy migration/DDL trên Supabase, các giao dịch tài chính, thay đổi chính sách bảo mật hệ thống. | **Risk 4:** Đóng băng toàn bộ hoạt động tự động; Bắt buộc Repository Owner trực tiếp thao tác hoặc phê duyệt bằng văn bản riêng. |
