# STORAGE ARCHITECTURE & POLICIES — SUPABASE CONTROL CENTER

Tài liệu thiết kế kiến trúc lưu trữ tệp tin (File Storage) và chính sách bảo vệ tài nguyên trên Supabase Storage.

---

## 1. Danh mục Storage Buckets

Hệ thống thiết lập sẵn 5 Buckets chuyên biệt:

| Tên Bucket | Tính chất truy cập | Dung lượng tối đa | Định dạng MIME cho phép | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **`avatars`** | **Public** | 5 MB | `image/png`, `image/jpeg`, `image/webp` | Ảnh đại diện người dùng và logo tổ chức. |
| **`user-uploads`** | **Private** | 50 MB | Ảnh, PDF, DOCX, XLSX | Tệp tải lên từ người dùng (hóa đơn, bài tập, tài liệu cần phân tích). |
| **`ai-outputs`** | **Private** | 100 MB | Ảnh sinh ra, PDF, JSON, PPTX, TXT | Sản phẩm đầu ra từ mô hình AI (slide giáo án, báo cáo thuế đã kết xuất). |
| **`knowledge`** | **Private** | 100 MB | PDF, Markdown, TXT, JSON | Tài liệu kiến thức nguồn phục vụ tìm kiếm ngữ nghĩa và RAG. |
| **`tool-assets`** | **Public** | 10 MB | SVG, PNG, WebP | Icon công cụ, sơ đồ luồng dữ liệu minh họa cho Tool Registry. |

---

## 2. Quy chuẩn Đường dẫn Tệp (Path Naming Conventions)

### 2.1. `avatars` Bucket
```text
avatars/{user_id}/avatar.png
avatars/organizations/{organization_id}/logo.png
```

### 2.2. `user-uploads` Bucket
```text
user-uploads/{user_id}/{task_id}/{timestamp}_{filename}
user-uploads/{organization_id}/{task_id}/{timestamp}_{filename}
```
*Ghi chú:* Thư mục cấp cao nhất luôn là `user_id` hoặc `organization_id` để RLS policy có thể trích xuất qua hàm `storage.foldername(name)[1]` nhằm kiểm tra quyền sở hữu.

### 2.3. `ai-outputs` Bucket
```text
ai-outputs/{task_id}/{step_number}_{asset_type}.{ext}
```

### 2.4. `knowledge` Bucket
```text
knowledge/{tenant_id}/{corpus_id}/{document_id}.pdf
```

---

## 3. Chính sách Phân quyền Lưu trữ (Storage RLS Policies)

1. **Bucket `avatars`:**
   - Đọc: Công khai cho mọi đối tượng (`public`).
   - Tải lên: Chỉ người dùng đã đăng nhập và chỉ được ghi vào thư mục có tiền tố là `auth.uid()`.
2. **Bucket `user-uploads`:**
   - Đọc/Ghi: Chỉ người dùng sở hữu thư mục tương ứng với `auth.uid()` hoặc thành viên quản trị của tổ chức liên quan.
3. **Bucket `ai-outputs`:**
   - Đọc: Chỉ người dùng tạo task AI hoặc thành viên tổ chức sở hữu task.
   - Ghi: Chỉ cấp quyền cho `service_role` (Worker daemon sau khi render file).
4. **Bucket `knowledge`:**
   - Đọc: Thành viên tổ chức có quyền truy cập corpus kiến thức.
   - Ghi: Quản trị viên tổ chức hoặc `service_role`.
