# LOCAL DEVELOPMENT GUIDE — HUY TECHNOLOGY AI CENTER

Hướng dẫn chi tiết thiết lập môi trường phát triển và kiểm thử cục bộ cho repository trung tâm `huy-ai-center`.

---

## 1. Yêu cầu Tiên quyết (Prerequisites)

- **Node.js:** `>= 20.0.0` (Khuyến nghị phiên bản LTS Node.js v22 hoặc v24)
- **npm:** `>= 10.0.0`
- **Git:** Quản lý mã nguồn theo quy chuẩn branch `feat/*`, `fix/*`, `chore/*`.
- **Hệ điều hành:** Hỗ trợ Windows (PowerShell), macOS hoặc Linux.

---

## 2. Thiết lập Môi trường (Setup)

### Bước 1: Cài đặt Dependencies
Từ thư mục gốc `huy-ai-center`:
```bash
npm install
```

### Bước 2: Cấu hình Biến Môi trường
Sao chép tệp mẫu:
```bash
cp .env.example .env
```
Điền các giá trị cho môi trường Local / Staging.  
*(Tuyệt đối không commit tệp `.env` hoặc bất kỳ khóa Service Role nào lên Git).*

---

## 3. Lệnh Phát triển & Vận hành Thường dùng

| Tác vụ | Lệnh thực thi | Ghi chú |
| :--- | :--- | :--- |
| **Biên dịch toàn bộ packages** | `npm run build` | Biên dịch `contracts`, `config`, `shared`, `dispatcher`, `control-center` |
| **Kiểm tra TypeScript (Typecheck)** | `npm run typecheck` | Kiểm tra lỗi type trên toàn bộ workspace |
| **Chạy toàn bộ Unit Tests** | `npm run test` | Chạy Node.js native test runner cho contracts, shared, dispatcher |
| **Chạy Control Center (Dashboard)** | `npm run dev --workspace=@huy-ai/control-center` | Khởi động Next.js App tại `http://localhost:3000` |
| **Chạy Dispatcher Daemon (Worker)** | `npm run start --workspace=@huy-ai/dispatcher` | Khởi động Worker lắng nghe tác vụ từ Task Queue |
| **Kiểm tra Health Endpoint của Dispatcher** | `curl http://127.0.0.1:8080/health` | Kiểm tra trạng thái máy chủ worker daemon |
| **Kiểm tra An toàn & Rò rỉ Secret** | `npm run verify:safety` | Quét secret, kiểm tra .gitignore, typecheck và tests |

---

## 4. Kiểm thử Hợp đồng Dữ liệu (Contracts Testing)

Package `@huy-ai/contracts` chứa tất cả các Zod schemas và TypeScript types cho:
- `AITask`, `AITaskStep`, `AIOutput`, `Agent`, `Tool`, `Node`, `QueueMessage`, `TaskStatus`.

Để chạy bộ kiểm thử riêng cho Contracts:
```bash
npm run test --workspace=@huy-ai/contracts
```

---

## 5. Quy tắc Cam kết An toàn (Production Safety Rule)

1. **Không can thiệp Production trực tiếp:** Mọi tác vụ phải được kiểm thử cục bộ trước.
2. **Không commit Secret:** Sử dụng `npm run verify:safety` trước khi tạo Pull Request.
3. **Branch Workflow:** Tạo nhánh riêng `feat/<tên-tính-năng>` xuất phát từ `main`.
