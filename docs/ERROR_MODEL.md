# STANDARDIZED ERROR MODEL — HUY TECHNOLOGY AI CENTER

Tài liệu quy chuẩn mô hình lỗi (Error Model) thống nhất cho toàn bộ hệ sinh thái API của **HUY TECHNOLOGY AI CENTER**.

---

## 1. Cấu trúc Khung Lỗi Chuẩn (Standard Error Envelope)

Mọi phản hồi lỗi từ hệ thống đều tuân theo cấu trúc JSON bất biến:

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Tài khoản của bạn không đủ tín dụng AI để thực thi tác vụ này.",
    "retryable": false,
    "request_id": "req_1726590123_4f8a2b1c",
    "details": {
      "required_credits": 25,
      "available_credits": 4
    }
  }
}
```

### Các trường dữ liệu:
- **`code` (Chuỗi Enum):** Mã định danh lỗi duy nhất bằng tiếng Anh viết hoa, hỗ trợ lập trình viên xử lý điều kiện rẽ nhánh (switch-case).
- **`message` (Chuỗi):** Thông điệp giải thích ngắn gọn, thân thiện và an toàn, có thể hiển thị trực tiếp cho người dùng cuối.
- **`retryable` (Boolean):** Cờ báo hiệu cho client biết lỗi này có thể thử lại tự động (true) hay là lỗi logic/phân quyền vĩnh viễn (false).
- **`request_id` (Chuỗi):** Mã định danh duy nhất của lượt gọi, đồng bộ với header HTTP `x-request-id`, phục vụ tra cứu log và hỗ trợ kỹ thuật.
- **`details` (Đối tượng JSON, không bắt buộc):** Dữ liệu ngữ cảnh bổ sung giúp gỡ lỗi (debug).

---

## 2. Bảng Tra cứu Mã Lỗi Chuẩn (Error Code Matrix)

| Mã lỗi (`code`) | HTTP Status | Retryable | Nguyên nhân phát sinh | Hành vi khuyến nghị cho Client |
| :--- | :---: | :---: | :--- | :--- |
| **`INVALID_INPUT`** | 400 | `false` | Dữ liệu gửi lên không đúng schema Zod hoặc JSON bị lỗi cú pháp. | Kiểm tra lại dữ liệu nhập, không tự động thử lại. |
| **`UNAUTHORIZED`** | 401 | `false` | Thiếu token hoặc token xác thực đã hết hạn / không hợp lệ. | Chuyển hướng người dùng về trang Đăng nhập hoặc làm mới token. |
| **`INSUFFICIENT_CREDITS`** | 402 | `false` | Ví tín dụng AI không đủ số dư để chi trả cho tác vụ. | Hiển thị thông báo nạp thêm tín dụng hoặc nâng cấp gói cước. |
| **`FORBIDDEN`** | 403 | `false` | Người dùng không có quyền truy cập tác vụ hoặc tài nguyên tổ chức. | Hiển thị thông báo từ chối truy cập (Access Denied). |
| **`TASK_NOT_FOUND`** | 404 | `false` | Không tìm thấy `task_id` được yêu cầu trong cơ sở dữ liệu. | Kiểm tra lại tính chính xác của mã định danh `task_id`. |
| **`TASK_ALREADY_FINISHED`** | 409 | `false` | Yêu cầu hủy một tác vụ đã ở trạng thái `completed`. | Cập nhật giao diện người dùng sang trạng thái đã hoàn tất. |
| **`PAYLOAD_TOO_LARGE`** | 413 | `false` | Kích thước dữ liệu gửi lên vượt quá giới hạn tối đa 1 MB. | Nén hoặc giảm bớt dung lượng tệp/văn bản trước khi gửi lại. |
| **`RATE_LIMIT_EXCEEDED`** | 429 | `true` | Gửi quá nhiều request trong một khoảng thời gian ngắn. | Chờ đợi theo khoảng thời gian trong header `Retry-After` rồi thử lại. |
| **`INTERNAL_ERROR`** | 500 | `true` | Lỗi máy chủ không mong muốn hoặc sự cố gián đoạn cơ sở dữ liệu tạm thời. | Thử lại tự động theo cơ chế Exponential Backoff (tối đa 3 lần). |

---

## 3. Chiến lược Thử lại của Client (Client Retry Strategy)

Đoạn mã mẫu khuyến nghị cho các website client khi nhận phản hồi từ API:

```typescript
import { withRetry } from '@huy-ai/shared';

async function fetchWithPolicy(url: string, options: RequestInit) {
  return withRetry(
    async () => {
      const response = await fetch(url, options);
      if (response.ok) return response.json();

      const errorPayload = await response.json();
      const err = new Error(errorPayload.error?.message || 'Lỗi hệ thống');
      (err as any).retryable = errorPayload.error?.retryable ?? false;
      (err as any).code = errorPayload.error?.code;
      throw err;
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      shouldRetry: (error: any) => error.retryable === true,
    }
  );
}
```
