# Hướng Dẫn Triển Khai Dispatcher Worker Qua Coolify Trên Máy Chủ Dell Precision M4800

> **Dành cho:** Quản trị viên hệ thống hoặc người dùng phổ thông (không yêu cầu kỹ năng lập trình chuyên sâu).  
> **Mục tiêu:** Vận hành phần mềm xử lý AI **Dispatcher Worker** trên máy chủ nội bộ Dell Precision M4800 (`huy-ai-node-01`) thông qua giao diện đồ họa trực quan Coolify.

---

## 1. Chuẩn Bị & Yêu Cầu Phần Cứng

- **Máy chủ vật lý:** Dell Precision M4800
- **Bộ nhớ RAM:** 32 GB
- **Ổ cứng lưu trữ:** 1 TB SSD
- **Hệ điều hành:** Ubuntu Server 24.04 LTS (đã kết nối dây mạng LAN hoặc Wi-Fi nội bộ)
- **Địa chỉ IP của máy:** Ví dụ `192.168.1.150` (hoặc hostname `huy-ai-node-01`)

---

## 2. Bước 1: Cài Đặt Coolify (Chỉ 1 Dòng Lệnh Duy Nhất)

Coolify là một bảng điều khiển tự động hóa máy chủ mã nguồn mở, hoạt động như một "Vercel / Heroku tự lưu trữ" ngay trên máy Dell của bạn.

1. Trên màn hình máy tính Ubuntu (hoặc thông qua phần mềm kết nối SSH như PuTTY / Terminal), dán dòng lệnh sau và nhấn **Enter**:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

2. Máy chủ sẽ tự động cài đặt Docker và Coolify trong khoảng 2 - 3 phút. Khi hoàn tất, màn hình sẽ hiển thị đường link truy cập.

---

## 3. Bước 2: Đăng Nhập Vào Bảng Điều Khiển Coolify

1. Mở trình duyệt web (Chrome, Edge, Safari...) trên bất kỳ máy tính hoặc điện thoại nào trong cùng mạng Wi-Fi.
2. Gõ địa chỉ IP của máy chủ Dell kèm cổng `8000`. Ví dụ:
   ```text
   http://192.168.1.150:8000
   ```
3. Trong lần đầu tiên truy cập, tạo tài khoản quản trị viên:
   - **Họ tên:** Huy Technology Admin
   - **Email:** admin@huycncdsai.io.vn
   - **Mật khẩu:** (Đặt mật khẩu an toàn và lưu lại)

---

## 4. Bước 3: Tạo Ứng Dụng Mới Từ GitHub

1. Tại thanh menu bên trái, nhấp vào **Projects** &rarr; Chọn **Default** (hoặc bấm **+ New Project** đặt tên là `Huy AI Center`).
2. Bấm vào nút **+ New Resource** màu tím ở góc phải màn hình.
3. Chọn mục **Public Repository** (hoặc **Private Repository** nếu dự án ở chế độ riêng tư):
   - **Repository URL:** `https://github.com/<tai-khoan-cua-ban>/huy-ai-center`
   - **Branch:** `main`
4. Chọn loại bản dựng: **Dockerfile**.
5. Trong ô **Dockerfile Location**, điền chính xác đường dẫn:
   ```text
   apps/dispatcher/Dockerfile
   ```
6. Bấm nút **Save** (Lưu).

---

## 5. Bước 4: Cài Đặt Các Biến Môi Trường (Chỉ Copy & Paste)

Chuyển sang thẻ **Environment Variables** (Biến môi trường) trên giao diện Coolify. Bấm vào nút **Developer View** hoặc nhập từng dòng sau:

```env
# Môi trường vận hành
NODE_ENV=production

# Chế độ AI (Giai đoạn ban đầu để là "mock" để chạy thử nghiệm an toàn 100%)
AI_PROVIDER_MODE=mock

# Kết nối cơ sở dữ liệu Supabase Control Center
SUPABASE_URL=https://<du-an-supabase-cua-ban>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Định danh nút máy chủ Dell
WORKER_NODE_ID=huy-ai-node-01
WORKER_NODE_NAME=Dell Precision M4800 Primary Node
WORKER_CONCURRENCY=2
WORKER_POLL_INTERVAL_MS=3000
WORKER_HEARTBEAT_INTERVAL_MS=10000

# Cổng kiểm tra sức khỏe
DISPATCHER_HEALTH_PORT=8080
```

> [!TIP]
> Bạn chỉ cần thay `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` lấy từ trang quản trị Supabase. Mọi thiết lập còn lại đã được tính toán tối ưu cho cấu hình 32GB RAM của Dell M4800.

Bấm nút **Save** để lưu lại toàn bộ cấu hình.

---

## 6. Bước 5: Cấu Hình Kiểm Tra Sức Khỏe (Healthcheck)

Chuyển sang thẻ **Healthcheck** trên Coolify để phần mềm tự động khởi động lại nếu có sự cố:

- **Path:** `/health`
- **Port:** `8080`
- **Interval:** `30s`
- **Retries:** `3`

---

## 7. Bước 6: Nhấn Triển Khai (Deploy)

1. Bấm vào nút **Deploy** màu xanh lớn ở góc trên bên phải màn hình.
2. Coolify sẽ tự động tải mã nguồn, đóng gói Docker container và khởi chạy Dispatcher.
3. Chuyển sang thẻ **Logs** để xem kết quả. Bạn sẽ thấy dòng chữ chào đón xuất hiện:
   ```text
   ========================================================
   Starting HUY TECHNOLOGY AI Dispatcher Worker Daemon
   Target Compute Node: Dell Precision M4800 (huy-ai-node-01)
   ========================================================
   [Heartbeat] Node registered successfully in nodes table.
   [DispatcherDaemon] Dispatcher is ready. Provider mode: [mock]. Concurrency: 2
   [QueuePoller] Starting queue poller (workerId: huy-ai-node-01, interval: 3000ms, concurrency: 2)
   ```

Khi biểu tượng trạng thái chuyển sang **Running (Màu xanh lá)**, máy chủ Dell M4800 đã chính thức trở thành một Worker xử lý AI trực tuyến trong hệ sinh thái!

---

## 8. Bước 7: Kích Hoạt Mô Hình Trí Tuệ Nhân Tạo Thật (Khi Sẵn Sàng)

Khi bạn muốn chuyển từ chế độ thử nghiệm sang mô hình AI nội bộ chạy ngoại tuyến 100%:

1. Cài đặt Ollama trên máy Dell:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull qwen2.5:7b
   ```
2. Trên giao diện Coolify, vào thẻ **Environment Variables**, đổi dòng:
   ```env
   AI_PROVIDER_MODE=ollama
   OLLAMA_BASE_URL=http://host.docker.internal:11434
   ```
3. Bấm **Redeploy**. Dispatcher sẽ tự động dùng trí tuệ nhân tạo Qwen 2.5 mà không cần thay đổi bất kỳ dòng mã nguồn nào!

---

## 9. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Vấn đề gặp phải | Nguyên nhân | Cách khắc phục đơn giản |
|---|---|---|
| Bấm deploy báo lỗi kết nối Supabase | Sai `SUPABASE_URL` hoặc khóa `SUPABASE_SERVICE_ROLE_KEY` | Kiểm tra lại thẻ **Environment Variables** trên Coolify, xóa khoảng trắng thừa ở đầu/cuối chuỗi khóa. |
| Trạng thái container báo "Unhealthy" | Cổng 8080 chưa mở hoặc chưa đặt đúng đường dẫn `/health` | Kiểm tra thẻ **Healthcheck**, đảm bảo cổng ghi `8080` và đường dẫn là `/health`. |
| Máy chủ khởi động lại mất kết nối | Nguồn điện hoặc chế độ ngủ (Sleep mode) của laptop | Đảm bảo máy Dell Precision cắm sạc trực tiếp và đã tắt chế độ Sleep khi gập nắp máy (`HandleLidSwitch=ignore` trong file `/etc/systemd/logind.conf`). |

---

## 10. Nguyên Tắc An Toàn
- Toàn bộ container hoạt động với tài khoản người dùng không đặc quyền (`USER node`), bảo vệ máy chủ Dell khỏi các nguy cơ can thiệp hệ điều hành.
- Khi máy chủ Dell tắt nguồn hoặc mất mạng, 3 website của bạn (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) vẫn hoạt động bình thường 100%, các tác vụ AI sẽ tự động xếp vào hàng đợi chờ máy Dell mở lại.
