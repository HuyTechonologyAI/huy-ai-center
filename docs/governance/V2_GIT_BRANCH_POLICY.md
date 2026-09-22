# CHÍNH SÁCH NHÁNH GIT VÀ BẢO VỆ MÃ NGUỒN (V2 GIT BRANCH POLICY)

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Kho lưu trữ:** `HuyTechonologyAI/edtech-ai-portfolio`  
**Nhánh Sản xuất Mục tiêu:** `main`  
**Trạng thái Kỹ thuật Hiện tại:** `BRANCH_PROTECTION: MANUAL_ACTION_REQUIRED`

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC BẢO VỆ NHÁNH `main`

Nhánh `main` là nhánh nguồn chân lý (Single Source of Truth) kết nối trực tiếp với hệ thống triển khai tự động Vercel Production (`https://www.huycncdsai.io.vn`).

Để bảo đảm tính toàn vẹn và ngăn ngừa rủi ro sai sót thao tác, các quy tắc kiểm soát bắt buộc phải được thiết lập:
1. **Bắt buộc Pull Request trước khi Merge (Require Pull Request before merging):** Không cho phép commit trực tiếp lên `main`.
2. **Chặn Đẩy Cưỡng bức (Block Force Pushes):** Nghiêm cấm hoàn toàn `git push --force` hoặc `git push --force-with-lease` lên `main`.
3. **Chặn Xóa Nhánh (Block Branch Deletion):** Ngăn chặn việc vô tình hoặc cố ý xóa nhánh `main`.
4. **Bắt buộc Giải quyết Hội thoại (Require Conversation Resolution):** Mọi ý kiến phản biện hoặc nhận xét trong PR phải được đóng/giải quyết trước khi sáp nhập.
5. **Bắt buộc Kiểm tra Trạng thái (Require Status Checks):** Các kiểm thử CI tự động (build, typecheck, unit tests) phải đạt màu xanh (pass) trước khi cho phép merge.
6. **Không khóa quyền Repository Owner (Do NOT lock repository owner out):** Cho phép Owner có quyền xử lý tình huống khẩn cấp theo quy trình incident cấp độ SEV-1.

---

## 2. TRẠNG THÁI HIỆN TẠI & HƯỚNG DẪN THIẾT LẬP THỦ CÔNG (MANUAL ACTION GUIDE)

### Báo cáo Trạng thái:
Do môi trường AI Agent hiện tại không lưu trữ GitHub Personal Access Token có quyền quản trị kho lưu trữ (`admin:repo`), lệnh API bảo vệ nhánh trả về `HTTP 401 Unauthorized`.  
Theo đúng quy tắc trung thực kỷ luật hệ thống:
```text
BRANCH_PROTECTION: MANUAL_ACTION_REQUIRED
```

### Các bước Thiết lập Thủ công dành cho Repository Owner:
Repository Owner thực hiện thiết lập trên giao diện GitHub Web theo các bước sau:

1. Truy cập trang cài đặt nhánh của kho lưu trữ:
   `https://github.com/HuyTechonologyAI/edtech-ai-portfolio/settings/branches`
2. Nhấp vào nút **Add branch protection rule** (hoặc **Add rule**).
3. Tại ô **Branch name pattern**, điền chính xác: `main`.
4. Tích chọn các mục kiểm soát an toàn sau:
   - [x] **Require a pull request before merging**
     - [x] *Require approvals:* 1 (hoặc để mặc định theo nhu cầu tổ chức)
     - [x] *Dismiss stale pull request approvals when new commits are pushed*
     - [x] *Require conversation resolution before merging*
   - [x] **Require status checks to pass before merging** (nếu có GitHub Actions CI)
   - [x] **Do not allow bypassing the above settings** (Áp dụng cho cả Administrators/Owner, hoặc bỏ chọn nếu Owner cần quyền can thiệp khẩn cấp)
   - [x] **Restrict who can push to matching branches**
   - [ ] *(Đảm bảo mục Allow force pushes và Allow deletions KHÔNG ĐƯỢC BẬT — mặc định bị Block)*
5. Nhấp **Create** / **Save changes** để lưu quy tắc bảo vệ.

---

## 3. TIÊU CHUẨN ĐẶT TÊN NHÁNH VÀ COMMIT (BRANCH & COMMIT STANDARD)

### Định danh Nhánh (Branch Naming):
- Tính năng mới: `feat/<mô-tả-ngắn>` (Ví dụ: `feat/06j-ux-b-corporate-v2-preview`)
- Vá lỗi sản xuất: `hotfix/<mã-sự-cố>` (Ví dụ: `hotfix/contact-form-validation`)
- Nâng cấp kỹ thuật: `refactor/<tên-module>`
- Tài liệu quản trị: `docs/<tên-báo-cáo>`

### Tiêu chuẩn Thông điệp Commit dành cho Tác tử AI (AI-Agent Commit Standard):
Mọi commit sinh ra bởi tác tử AI phải tuân thủ chuẩn Conventional Commits kèm theo phạm vi (scope) và mã giai đoạn/nhiệm vụ:

- `feat(web): <nội dung>` — Phát triển tính năng mới cho website.
- `fix(web): <nội dung>` — Sửa lỗi giao diện hoặc logic.
- `docs(web): <nội dung>` — Cập nhật tài liệu kỹ thuật, báo cáo.
- `security(web): <nội dung>` — Tăng cường phòng vệ, cấu hình header, RLS.
- `refactor(web): <nội dung>` — Tối ưu hóa mã nguồn mà không đổi hành vi.
- `test(web): <nội dung>` — Bổ sung hoặc cập nhật bộ kiểm thử tự động.

*Ví dụ chuẩn mực:*  
`feat(web): promote corporate v2 to root homepage with legacy archive [06J-UX-D]`  
`docs(governance): establish post-launch source control hardening [06J-UX-D.1]`
