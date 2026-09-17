---
name: 02-production-safety
description: Ngăn chặn tuyệt đối các hành vi nguy hiểm lên Production, bảo đảm an toàn dữ liệu, Git workflow và quy trình phê duyệt.
---

# Production Safety Skill

## 1. Mục đích & Vai trò
Thiết lập và thực thi các hàng rào an toàn (Guardrails) nghiêm ngặt nhất nhằm bảo vệ tính toàn vẹn của dữ liệu và hệ sinh thái đang vận hành.

## 2. Quy tắc cấm tuyệt đối (NEVER DO)
- **KHÔNG** sửa chữa trực tiếp trên môi trường production.
- **KHÔNG** xóa database hoặc chạy các câu lệnh `DROP TABLE`, `TRUNCATE` thiếu kiểm soát.
- **KHÔNG** chạy migration phá hủy dữ liệu (destructive migrations: drop column, rename column mà không có kế hoạch chuyển tiếp).
- **KHÔNG** thay đổi bản ghi DNS hoặc chuyển đổi domain.
- **KHÔNG** thay đổi cấu hình xác thực (Authentication) đang chạy của 3 website.
- **KHÔNG** chỉnh sửa trực tiếp biến môi trường production.
- **KHÔNG** `git push --force` hoặc commit trực tiếp vào nhánh `main`.
- **KHÔNG** deploy lên production nếu chưa có sự phê duyệt rõ ràng từ con người (Human Approval).

## 3. Quy trình bắt buộc (ALWAYS DO)
Mọi tác vụ phải tuân thủ nghiêm ngặt chu trình 9 bước:
```text
INSPECT
  ↓
PLAN
  ↓
BRANCH (feat/..., fix/..., chore/..., docs/..., infra/...)
  ↓
IMPLEMENT
  ↓
TEST
  ↓
STAGING
  ↓
REPORT
  ↓
HUMAN APPROVAL
  ↓
PRODUCTION
```

## 4. Checklist an toàn trước khi commit/push
- [ ] Đang ở nhánh làm việc riêng (không phải `main`)?
- [ ] Đã kiểm tra `.gitignore` chưa?
- [ ] Có file `.env` hay secret nào vô tình bị stage không?
- [ ] Toàn bộ unit tests và typecheck đã vượt qua chưa?
- [ ] Kế hoạch rollback đã sẵn sàng nếu phát sinh sự cố chưa?
