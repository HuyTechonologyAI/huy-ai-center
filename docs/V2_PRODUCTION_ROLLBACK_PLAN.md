# KẾ HOẠCH PHỤC HỒI / ROLLBACK SẢN XUẤT (V2 PRODUCTION ROLLBACK PLAN)

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Ngày thiết lập:** 2026-09-21  
**Mục đích:** Hướng dẫn các bước phục hồi khẩn cấp trạng thái sản xuất về phiên bản tiền Cutover nếu phát sinh sự cố nghiêm trọng.

---

## 1. MỐC PHỤC HỒI ĐÃ LƯU TRỮ (RECOVERY CHECKPOINTS)

- **Git Rollback Tag:** `pre-corporate-v2-cutover-2026-09-21`
- **Commit SHA tiền Cutover:** `7f3dfdf7f5c0fe59381da431bff7bc473082f5bc`
- **Vercel Baseline Deployment:** `sin1::zmdn5-1790003589654-128f57e2289a`
- **Remote Origin:** `https://github.com/HuyTechonologyAI/edtech-ai-portfolio.git`

---

## 2. QUY TRÌNH ROLLBACK TỨC THÌ (INSTANT ROLLBACK VIA VERCEL DASHBOARD)

Thời gian xử lý: `< 30 giây` (Không cần biên dịch lại).

1. Truy cập Vercel Dashboard của dự án:
   `https://vercel.com/huytechonologyais-projects/edtech-ai-portfolio`
2. Chọn mục **Deployments**.
3. Tìm bản deployment tiền Cutover: `7f3dfdf7f5c0fe59381da431bff7bc473082f5bc` (hoặc nhấp menu `...` của bản build trước đó).
4. Chọn **Instant Rollback / Promote to Production**.
5. Vercel sẽ chuyển hướng lưu lượng truy cập của domain `https://www.huycncdsai.io.vn` về ngay bản build trước đó.

---

## 3. QUY TRÌNH ROLLBACK MÃ NGUỒN GIT (GIT REVERT / RECOVERY)

Nếu cần hoàn tác nhánh `main` trong Git:

```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\edtech-ai-portfolio
git checkout main
git reset --hard pre-corporate-v2-cutover-2026-09-21
git push origin main --force-with-lease
```

*(Lưu ý: Chỉ thực hiện khi có sự đồng thuận của Founder và người vận hành hệ thống).*
