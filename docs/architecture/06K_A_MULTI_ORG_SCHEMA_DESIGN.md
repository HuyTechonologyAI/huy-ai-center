# THIẾT KẾ CHI TIẾT CẤU TRÚC DỮ LIỆU ĐA TỔ CHỨC
## PHASE 06K-A — MULTI-ORGANIZATION SCHEMA SPECIFICATION

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Hệ thống:** HUY AI CENTER / HAIP CONTROL PLANE  
**Chế độ thực thi:** THIẾT KẾ KIẾN TRÚC (DESIGN ONLY — KHÔNG CHẠY DDL TRÊN PRODUCTION)  

---

## 1. ĐẶC TẢ 6 TỔ CHỨC CHUẨN HÓA (CANONICAL ORGANIZATIONS)

Mô hình hệ thống đóng băng chính xác 6 tổ chức đại diện cho 6 Business Units trong Holding Group:

1. **`org-01-huytech` — HUY TECHNOLOGY AI GROUP**
   - **Vai trò:** Parent Holding / Technology / Group Control / Điều phối tập đoàn.
   - **Cost Center:** `CC-01-HUYTECH`
   - **Trần phân loại dữ liệu (Ceiling):** `RESTRICTED`
   - **Parent Org ID:** `NULL` (Tổ chức mẹ cao nhất).
2. **`org-02-aischool` — GVCNCDSAI AI SCHOOL**
   - **Vai trò:** Giáo dục đào tạo thực chiến AI, sư phạm số, học liệu thông minh.
   - **Cost Center:** `CC-02-AISCHOOL`
   - **Trần phân loại dữ liệu (Ceiling):** `CONFIDENTIAL`
   - **Parent Org ID:** `'org-01-huytech'`
3. **`org-03-smarttax` — SMARTTAX AI**
   - **Vai trò:** Kê khai thuế, xử lý hóa đơn tự động, tuân thủ pháp lý tài chính.
   - **Cost Center:** `CC-03-SMARTTAX`
   - **Trần phân loại dữ liệu (Ceiling):** `RESTRICTED` (Phân vùng an ninh logic riêng biệt).
   - **Parent Org ID:** `'org-01-huytech'`
4. **`org-04-media-tech` — HUY TECH MEDIA**
   - **Vai trò:** Truyền thông công nghệ, tự động hóa, tin tức AI doanh nghiệp.
   - **Cost Center:** `CC-04-MEDIA-TECH`
   - **Trần phân loại dữ liệu (Ceiling):** `INTERNAL`
   - **Parent Org ID:** `'org-01-huytech'`
5. **`org-05-media-edu` — GVCNCDSAI MEDIA**
   - **Vai trò:** Truyền thông giáo dục, kết nối giáo viên, học sinh, hướng nghiệp STEM.
   - **Cost Center:** `CC-05-MEDIA-EDU`
   - **Trần phân loại dữ liệu (Ceiling):** `INTERNAL`
   - **Parent Org ID:** `'org-01-huytech'`
6. **`org-06-media-creative` — HUY CREATIVE MEDIA**
   - **Vai trò:** Sáng tạo nội dung đa phương tiện, nghệ thuật số, âm nhạc, giải trí AI.
   - **Cost Center:** `CC-06-MEDIA-CREATIVE`
   - **Trần phân loại dữ liệu (Ceiling):** `INTERNAL`
   - **Parent Org ID:** `'org-01-huytech'`

---

## 2. ĐẶC TẢ CHI TIẾT CÁC BẢNG MỚI (PSEUDO-DDL)

### 2.1. Bảng `public.organizations`
```sql
-- DESIGN ONLY: To be created in Phase 06K-B
CREATE TABLE IF NOT EXISTS public.organizations (
    id text PRIMARY KEY,                                      -- Canonical slug (e.g. 'org-01-huytech')
    name text NOT NULL,                                       -- Tên đầy đủ
    code text NOT NULL UNIQUE,                                -- Mã viết tắt (e.g. 'HUYTECH')
    cost_center_code text NOT NULL UNIQUE,                    -- Mã hạch toán (e.g. 'CC-01-HUYTECH')
    role_description text NOT NULL,                           -- Mô tả chức năng kinh doanh
    parent_org_id text REFERENCES public.organizations(id) 
        ON DELETE RESTRICT,                                   -- Trỏ về công ty mẹ (org-01)
    status text NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    data_classification_ceiling text NOT NULL DEFAULT 'CONFIDENTIAL'
        CHECK (data_classification_ceiling IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_no_self_parent CHECK (parent_org_id <> id)
);
```

### 2.2. Bảng `public.departments`
```sql
-- DESIGN ONLY: To be created in Phase 06K-B
CREATE TABLE IF NOT EXISTS public.departments (
    id text PRIMARY KEY,                                      -- Canonical global ID (e.g. 'dept-01-exec')
    organization_id text NOT NULL REFERENCES public.organizations(id) 
        ON DELETE RESTRICT,
    code text NOT NULL,                                       -- Mã phòng ban nội bộ tổ chức (e.g. 'EXEC')
    name text NOT NULL,                                       -- Tên phòng ban
    description text,
    parent_department_id text REFERENCES public.departments(id) 
        ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    cost_center_subcode text,                                 -- Phân bổ hạch toán phòng ban
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_dept_org_code UNIQUE (organization_id, code),
    CONSTRAINT chk_no_self_parent_dept CHECK (parent_department_id <> id)
);
```

### 2.3. Bảng `public.organization_memberships`
```sql
-- DESIGN ONLY: To be created in Phase 06K-B
CREATE TABLE IF NOT EXISTS public.organization_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) 
        ON DELETE CASCADE,                                    -- Xóa user -> xóa membership
    organization_id text NOT NULL REFERENCES public.organizations(id) 
        ON DELETE RESTRICT,                                   -- Không thể xóa tổ chức còn thành viên
    membership_role text NOT NULL 
        CHECK (membership_role IN ('owner', 'admin', 'reviewer', 'operator', 'member', 'auditor')),
    department_id text REFERENCES public.departments(id) 
        ON DELETE SET NULL,                                   -- Xóa phòng ban -> giữ membership, set null dept
    is_primary boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED')),
    permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_org UNIQUE (user_id, organization_id)
);
```

### 2.4. Bảng `public.ai_policies`
```sql
-- DESIGN ONLY: To be created in Phase 06K-B
CREATE TABLE IF NOT EXISTS public.ai_policies (
    id text PRIMARY KEY,                                      -- Canonical policy ID (e.g. 'pol-smarttax-boundary-01')
    name text NOT NULL,
    policy_scope text NOT NULL 
        CHECK (policy_scope IN ('GROUP', 'ORGANIZATION', 'DEPARTMENT', 'AGENT')),
    target_id text NOT NULL,                                  -- Org ID, Dept ID, Agent ID, hoặc '*'
    rules jsonb NOT NULL,                                     -- Định nghĩa luật ALLOW / DENY / REQUIRE_APPROVAL
    priority integer NOT NULL DEFAULT 100,                    -- Số nhỏ hơn = Ưu tiên cao hơn
    status text NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'DISABLED')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 3. ĐẶC TẢ CHI TIẾT MỞ RỘNG CÁC BẢNG HIỆN HỮU (PSEUDO-ALTER)

### 3.1. Mở rộng Bảng `public.agents`
```sql
-- DESIGN ONLY: Additive columns for agents table
ALTER TABLE public.agents
    ADD COLUMN IF NOT EXISTS organization_id text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id text REFERENCES public.departments(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS hierarchy_level smallint DEFAULT 1 CHECK (hierarchy_level BETWEEN 0 AND 4),
    ADD COLUMN IF NOT EXISTS cost_center_code text,
    ADD COLUMN IF NOT EXISTS current_agent_version_id uuid;

-- Ràng buộc trỏ trực tiếp phiên bản hiện hành (D6 Decision)
-- (Sẽ được thiết lập sau khi bảng agent_versions được nạp dữ liệu)
ALTER TABLE public.agents
    ADD CONSTRAINT fk_agents_current_version 
    FOREIGN KEY (current_agent_version_id) 
    REFERENCES public.agent_versions(id) ON DELETE RESTRICT;
```

### 3.2. Mở rộng Bảng `public.agent_versions` (Agent Card V2 Persistence)
```sql
-- DESIGN ONLY: Additive columns for agent_versions table
ALTER TABLE public.agent_versions
    ADD COLUMN IF NOT EXISTS agent_card jsonb,
    ADD COLUMN IF NOT EXISTS agent_card_hash text;

-- Khóa bất biến chống trùng lặp phiên bản
ALTER TABLE public.agent_versions
    ADD CONSTRAINT uq_agent_version UNIQUE (agent_id, version);
```

### 3.3. Mở rộng Bảng `public.ai_tasks`
```sql
-- DESIGN ONLY: Additive columns for ai_tasks table
ALTER TABLE public.ai_tasks
    ADD COLUMN IF NOT EXISTS organization_id text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id text REFERENCES public.departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'INTERNAL' 
        CHECK (data_classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
    ADD COLUMN IF NOT EXISTS cost_center_code text,           -- Historical snapshot
    ADD COLUMN IF NOT EXISTS requested_by_organization_id text REFERENCES public.organizations(id) ON DELETE SET NULL;
```

### 3.4. Mở rộng Bảng `public.ai_task_steps`
```sql
-- DESIGN ONLY: Additive audit columns for ai_task_steps
ALTER TABLE public.ai_task_steps
    ADD COLUMN IF NOT EXISTS sender_organization_id text,
    ADD COLUMN IF NOT EXISTS recipient_organization_id text;
```

### 3.5. Mở rộng Bảng `public.ai_outputs`
```sql
-- DESIGN ONLY: Additive columns for ai_outputs
ALTER TABLE public.ai_outputs
    ADD COLUMN IF NOT EXISTS organization_id text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'INTERNAL'
        CHECK (data_classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
    ADD COLUMN IF NOT EXISTS release_status text DEFAULT 'DRAFT'
        CHECK (release_status IN ('DRAFT', 'QA_APPROVED', 'PUBLIC_APPROVED', 'REVOKED'));
```

---

## 4. CHIẾN LƯỢC KHÓA NGOẠI VÀ BẢO TOÀN LỊCH SỬ (ON DELETE POLICY)

| Mối quan hệ | Khóa chính | Khóa ngoại | Hành vi ON DELETE | Rationale (Lý do kiến trúc) |
| :--- | :--- | :--- | :---: | :--- |
| **Org -> Dept** | `organizations.id` | `departments.organization_id` | **`RESTRICT`** | Ngăn chặn việc vô tình xóa một BU khi vẫn còn cơ cấu phòng ban trực thuộc. |
| **Org -> Agent** | `organizations.id` | `agents.organization_id` | **`RESTRICT`** | Tác tử gắn liền với trách nhiệm pháp lý và ngân sách của BU. |
| **Org -> Task** | `organizations.id` | `ai_tasks.organization_id` | **`RESTRICT`** | Hồ sơ kiểm toán tác vụ AI là bất biến, không bao giờ được xóa theo tầng (cascade). |
| **Dept -> Agent** | `departments.id` | `agents.department_id` | **`RESTRICT`** | Tác tử phòng ban phải được điều chuyển trước khi giải thể phòng ban. |
| **Dept -> Task** | `departments.id` | `ai_tasks.department_id` | **`SET NULL`** | Nếu phòng ban tái cấu trúc, tác vụ vẫn thuộc sở hữu của tổ chức. |
| **User -> Membership** | `auth.users.id` | `memberships.user_id` | **`CASCADE`** | Nếu tài khoản người dùng bị xóa hoàn toàn khỏi auth, membership bị hủy tương ứng. |
| **Agent -> Version** | `agents.id` | `agent_versions.agent_id` | **`RESTRICT`** | Lịch sử phiên bản tác tử và Agent Card là vĩnh viễn (immutable audit log). |

---

## 5. THIẾT KẾ CHỈ MỤC TỐI ƯU HÓA DISPATCHER (INDEX DESIGN)

Các chỉ mục được chọn lọc nghiêm ngặt phục vụ các truy vấn thường trực của HAIP Dispatcher:

1. **`idx_orgs_status`:** `CREATE INDEX idx_orgs_status ON public.organizations(status);`  
   *Mục đích:* Tra cứu nhanh danh sách các BU đang hoạt động.
2. **`idx_depts_org_status`:** `CREATE INDEX idx_depts_org_status ON public.departments(organization_id, status);`  
   *Mục đích:* Lọc các phòng ban khả dụng của một tổ chức.
3. **`idx_memberships_user_org`:** `CREATE INDEX idx_memberships_user_org ON public.organization_memberships(user_id, organization_id);`  
   *Mục đích:* Giải quyết RLS và kiểm tra quyền hạn truy cập của người dùng trong < 2ms.
4. **`idx_agents_org_dept_enabled`:** `CREATE INDEX idx_agents_org_dept_enabled ON public.agents(organization_id, department_id, enabled);`  
   *Mục đích:* Dispatcher tìm kiếm tác tử tiếp nhận tác vụ trong nội bộ phòng ban/tổ chức.
5. **`idx_agents_level_enabled`:** `CREATE INDEX idx_agents_level_enabled ON public.agents(hierarchy_level, enabled);`  
   *Mục đích:* Điều phối tác vụ theo cấp bậc phân quyền (L4 -> L1).
6. **`idx_agent_versions_lookup`:** `CREATE UNIQUE INDEX idx_agent_versions_lookup ON public.agent_versions(agent_id, version);`  
   *Mục đích:* Truy vấn thẻ Agent Card V2 bất biến tức thì theo SemVer.
7. **`idx_tasks_org_status`:** `CREATE INDEX idx_tasks_org_status ON public.ai_tasks(organization_id, status);`  
   *Mục đích:* Lọc tác vụ theo tổ chức và trạng thái máy trạng thái (QUEUED, RUNNING, v.v.).
8. **`idx_tasks_cost_center_created`:** `CREATE INDEX idx_tasks_cost_center_created ON public.ai_tasks(cost_center_code, created_at);`  
   *Mục đích:* Phục vụ báo cáo chi phí, token tiêu thụ và thống kê tài chính định kỳ theo trung tâm chi phí.
9. **`idx_outputs_org_release`:** `CREATE INDEX idx_outputs_org_release ON public.ai_outputs(organization_id, release_status);`  
   *Mục đích:* Kiểm soát xuất bản tạo phẩm AI an toàn liên tổ chức.
