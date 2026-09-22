---
name: "Báo cáo Sự cố Sản xuất (Production Incident)"
about: "Báo cáo và xử lý sự cố vận hành trên hệ thống production https://www.huycncdsai.io.vn"
title: "[INCIDENT] "
labels: ["incident", "production"]
assignees: ""
---

## 1. Mức độ Nghiêm trọng (Severity Level)
- [ ] **SEV-1 (Khẩn cấp):** Toàn bộ website dừng hoạt động / Lộ lọt mã bí mật / Rủi ro dữ liệu nghiêm trọng (Dừng deploy ngay lập tức, rollback).
- [ ] **SEV-2 (Nghiêm trọng):** Tính năng chính bị hỏng / Luồng liên hệ không hoạt động / Lỗi xác thực (Hotfix branch + PR).
- [ ] **SEV-3 (Trung bình):** Một phân hệ bị lỗi / Tích hợp bên ngoài gián đoạn / Suy giảm hiệu năng cục bộ.
- [ ] **SEV-4 (Thấp):** Lỗi giao diện nhỏ / Lệch hiển thị / Sai chính tả / Vấn đề UX không ảnh hưởng luồng nghiệp vụ.

---

## 2. Thông tin Sự cố (Incident Details)
- **Tên miền / URL bị ảnh hưởng:** `https://www.huycncdsai.io.vn/...`
- **Thời điểm phát hiện đầu tiên (First Observed):** `YYYY-MM-DD HH:mm:ss GMT+7`
- **Mức độ ảnh hưởng (Impact Summary):**
- **Thay đổi gần nhất liên quan (Recent Change / Commit SHA):**

---

## 3. Bằng chứng & Nhật ký Lỗi (Error Evidence)
- **HTTP Status Code:** (Ví dụ: 500, 502, 404, 307...)
- **Ảnh chụp màn hình lỗi / Network Response:**
- **Nhật ký Console Browser / Vercel Server Logs:**
```text
[Dán log hoặc mã lỗi tại đây]
```

---

## 4. Quyết định Khắc phục & Rollback (Mitigation & Rollback Decision)
- [ ] **Kích hoạt Rollback tức thì trên Vercel Dashboard:**
  - Deployment khôi phục: `____________________`
  - Thời gian hoàn tất rollback:
- [ ] **Tạo Hotfix Branch:** `hotfix/...` (Tuyệt đối không push trực tiếp vào `main`).

---

## 5. Kết luận & Ghi chú Sau Sự cố (Resolution & Post-Incident Notes)
- **Nguyên nhân gốc rễ (Root Cause):**
- **Hành động phòng ngừa tái diễn (Preventive Actions):**
- **Trạng thái đóng:** [ ] Resolved [ ] Monitoring [ ] Closed
