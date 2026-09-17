---
name: 05-api-contract-guardian
description: Bảo vệ hợp đồng giao tiếp (API Contracts, schemas, types) giữa 3 website, Control Center, Supabase và AI Dispatcher Worker.
---

# API Contract Guardian Skill

## 1. Mục đích & Vai trò
Thiết lập và giám sát tính bất biến, tương thích ngược của tất cả các Data Contracts và API Interfaces trong hệ sinh thái AI Center.

## 2. Tiêu chuẩn Hợp đồng dữ liệu (`packages/contracts`)
1. **Single Source of Truth:**
   - Mọi định nghĩa về Task, Worker Node, Heartbeat, Adapter Request/Response phải nằm tập trung tại `packages/contracts`.
   - Các ứng dụng (`apps/control-center`, `apps/dispatcher`, và các website) import types từ package này thay vì tự định nghĩa rời rạc.
2. **Runtime Validation với Zod:**
   - Mọi payload vào Queue hoặc nhận từ AI Service phải được validate bằng Zod schema tương ứng trước khi xử lý.
3. **Quy tắc Tương thích ngược (Backward Compatibility):**
   - Không xóa field bắt buộc trong schema đang dùng.
   - Khi thêm trường mới, phải đặt giá trị mặc định hoặc đánh dấu `optional` (`field?: string`).
   - Nếu có breaking change, phải tạo version mới (vd: `v1`, `v2`).

## 3. Checklist khi thay đổi Contract
- [ ] Zod schema và TypeScript type đã đồng bộ chưa?
- [ ] Có phá vỡ payload gửi từ 3 website hiện hữu không?
- [ ] Có viết unit test xác nhận validation passes và fails đúng kịch bản không?
