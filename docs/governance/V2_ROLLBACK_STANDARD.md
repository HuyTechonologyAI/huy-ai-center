# TIÊU CHUẨN VÀ QUY TRÌNH PHỤC HỒI SẢN XUẤT (V2 ROLLBACK STANDARD)

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Tên miền Sản xuất:** `https://www.huycncdsai.io.vn`  
**Trạng thái Sẵn sàng Phục hồi:** **ROLLBACK_READY: YES**

---

## 1. THỨ TỰ ƯU TIÊN PHỤC HỒI CHUẨN TẮC (CANONICAL ROLLBACK ORDER)

Khi xảy ra sự cố cấp độ SEV-1 đe dọa sự ổn định của hệ thống sản xuất, việc phục hồi phải tuân thủ đúng thứ tự ưu tiên sau:

### Ưu tiên 1: Instant Rollback trên Vercel Dashboard (Thời gian xử lý: < 30 giây)
- **Phương thức:** Chuyển hướng lưu lượng truy cập (DNS traffic routing) tại tầng CDN Edge về bản build tốt gần nhất đã biết (known-good deployment).
- **Ưu điểm:** Tức thì, không tốn thời gian biên dịch lại mã nguồn, hoàn toàn không can thiệp vào Git repository.
- **Thực thi:**
  1. Đăng nhập Vercel Dashboard: `https://vercel.com/huytechonologyais-projects/edtech-ai-portfolio`.
  2. Chọn mục **Deployments**.
  3. Tìm bản deployment baseline: `sin1::zmdn5-1790003589654-128f57e2289a` (commit `7f3dfdf`).
  4. Nhấp vào menu hành động (`...`) và chọn **Promote to Production / Instant Rollback**.

### Ưu tiên 2: Git Revert Pull Request (Thời gian xử lý: ~2-3 phút)
- **Phương thức:** Tạo một commit đảo ngược an toàn (`git revert -m 1 <merge-commit-sha>`) trên nhánh riêng, tạo PR và merge vào `main`.
- **Ưu điểm:** Bảo tồn trọn vẹn lịch sử commit của Git, minh bạch và có thể truy vết nguồn gốc thay đổi.
- **Thực thi:**
  ```powershell
  git checkout -b hotfix/revert-production-issue
  git revert -m 1 32d096ab22e48f0581da0334c429f6d1884442d6
  git push origin hotfix/revert-production-issue
  # Tạo Pull Request và tiến hành Merge sau khi duyệt
  ```

### Ưu tiên 3: Phục hồi theo Tag Tiền Cutover (Pre-Cutover Tag Recovery)
- **Phương thức:** Khôi phục trạng thái nhánh theo mốc tag đánh dấu trước khi chuyển giao.
- **Thực thi:** Sử dụng tag `pre-corporate-v2-cutover-2026-09-21` (trỏ đến commit `7f3dfdf7f5c0fe59381da431bff7bc473082f5bc`) để đối soát và triển khai lại.

---

## 2. CÁC HÀNH ĐỘNG BỊ CẤM TUYỆT ĐỐI KHI ROLLBACK

Để bảo vệ tính toàn vẹn của kho lưu trữ, nghiêm cấm thực hiện các hành động sau:
- **Nghiêm cấm `git push --force` lên nhánh `main` (Never force push main).**
- **Nghiêm cấm `git reset --hard` trực tiếp trên remote (Never destructive reset).**
- **Nghiêm cấm xóa bỏ lịch sử commit của kho lưu trữ (Never history deletion).**

---

## 3. KẾT QUẢ ĐỐI SOÁT TÍNH SẴN SÀNG PHỤC HỒI (NON-DESTRUCTIVE VERIFICATION)

Hệ thống đã thực hiện kiểm tra đối soát không phá hủy (non-destructive check):
- **Rollback Tag tồn tại:** `pre-corporate-v2-cutover-2026-09-21` (Đã xác minh phân giải chính xác về `7f3dfdf7f5c0fe59381da431bff7bc473082f5bc`).
- **Deployment Trước đó đã được xác định:** `sin1::zmdn5-1790003589654-128f57e2289a`.
- **Quy trình phục hồi đã được lập văn bản đầy đủ:** Có tài liệu hướng dẫn từng bước.
- **Đầu mối chịu trách nhiệm đã xác định:** Ngô Quốc Huy (Founder & Group Director).

**Kết luận:**  
`ROLLBACK_READY: YES`
