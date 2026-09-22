# SƠ ĐỒ THỰC THỂ LIÊN KẾT (ERD) ĐA TỔ CHỨC
## PHASE 06K-A — MULTI-ORGANIZATION ENTITY RELATIONSHIP DESIGN

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Hệ thống:** HUY AI CENTER / HAIP CONTROL PLANE  
**Phiên bản Thiết kế:** V2.0 Multi-Org Architecture  
**Phân loại Thành phần:** `[EXISTING]` Hiện hữu | `[NEW]` Bổ sung mới | `[EXTENDED]` Mở rộng cột  

---

## 1. SƠ ĐỒ MERMAID ERD TỔNG THỂ

```mermaid
erDiagram
    %% Auth System
    "auth.users" {
        uuid id PK
        string email
    }

    %% Core Multi-Org Model [NEW]
    organizations ||--o{ departments : "owns"
    organizations ||--o{ organization_memberships : "has_members"
    organizations ||--o{ agents : "owns_agents"
    organizations ||--o{ ai_tasks : "owns_tasks"
    organizations ||--o{ ai_outputs : "owns_outputs"
    organizations ||--o{ ai_policies : "governed_by"

    departments ||--o{ departments : "sub_departments"
    departments ||--o{ organization_memberships : "assigned_dept"
    departments ||--o{ agents : "hosts_agents"
    departments ||--o{ ai_tasks : "scopes_tasks"

    "auth.users" ||--o{ organization_memberships : "holds_membership"
    "auth.users" ||--o{ ai_tasks : "created_by"

    %% Agent Model [EXTENDED]
    agents ||--|{ agent_versions : "has_version_history"
    agents ||--o| agent_versions : "points_to_current_version"
    agents ||--o{ ai_tasks : "assigned_to"

    %% Task Execution & HAIP Audit [EXTENDED]
    ai_tasks ||--o{ ai_task_steps : "executes_steps"
    ai_tasks ||--o{ ai_outputs : "produces_outputs"

    %% Policy & Governance [NEW]
    organizations ||--o{ organizations : "parent_holding"

    %% Entity Definitions with Field Detail
    organizations {
        text id PK "Slug (org-01 to org-06)"
        string name "Tên pháp nhân/BU"
        string code UK "Mã BU viết tắt"
        string cost_center_code UK "Mã trung tâm chi phí"
        text parent_org_id FK "Trỏ về Holding (org-01)"
        string status "ACTIVE, SUSPENDED, ARCHIVED"
        string data_classification_ceiling "PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED"
        jsonb metadata
    }

    departments {
        text id PK "Global Canonical ID"
        text organization_id FK "Thuộc 1 tổ chức duy nhất"
        string code "Mã phòng ban nội bộ"
        string name "Tên phòng ban"
        text parent_department_id FK "Phòng ban cấp cha"
        string status "ACTIVE, INACTIVE, ARCHIVED"
        string cost_center_subcode "Mã phân bổ chi phí con"
        jsonb metadata
    }

    organization_memberships {
        uuid id PK
        uuid user_id FK "auth.users.id"
        text organization_id FK "organizations.id"
        string membership_role "owner, admin, reviewer, operator, member, auditor"
        text department_id FK "departments.id (nullable)"
        boolean is_primary "Tổ chức mặc định của user"
        string status "ACTIVE, INVITED, SUSPENDED, REVOKED"
        jsonb permissions
    }

    agents {
        uuid id PK
        string name UK
        text organization_id FK "[EXTENDED] Tổ chức chủ quản"
        text department_id FK "[EXTENDED] Phòng ban (nullable)"
        smallint hierarchy_level "[EXTENDED] L4 to L0"
        string cost_center_code "[EXTENDED] Snapshot trung tâm chi phí"
        uuid current_agent_version_id FK "[EXTENDED] Trỏ trực tiếp version active"
        string version "Display version"
        smallint risk_ceiling "0 to 4"
        boolean enabled
        string health_status
    }

    agent_versions {
        uuid id PK
        uuid agent_id FK
        string version "SemVer (1.0.0)"
        string schema_version "Agent Card schema version (2.0)"
        jsonb agent_card "[EXTENDED] Canonical Agent Card V2"
        string agent_card_hash "[EXTENDED] SHA-256 hash"
        text[] capabilities
        smallint risk_ceiling
        integer max_parallel_tasks
        timestamptz created_at "Immutable historical snapshot"
    }

    ai_tasks {
        uuid id PK
        uuid owner_user_id FK "auth.users.id"
        text organization_id FK "[EXTENDED] Tổ chức sở hữu tác vụ"
        text department_id FK "[EXTENDED] Phòng ban sở hữu tác vụ"
        string data_classification "[EXTENDED] PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED"
        string cost_center_code "[EXTENDED] Snapshot chi phí thời điểm tạo"
        text requested_by_organization_id FK "[EXTENDED] Tổ chức ủy quyền (cross-org)"
        uuid assigned_agent_id FK "agents.id"
        string status "16-state canonical machine"
        smallint risk_level "0 to 4"
        boolean approval_required
        string approval_status
    }

    ai_task_steps {
        uuid id PK
        uuid task_id FK
        text sender_organization_id "[EXTENDED] Tổ chức gửi thông điệp"
        text recipient_organization_id "[EXTENDED] Tổ chức nhận thông điệp"
        string sender_type
        string sender_id
        string recipient_type
        string recipient_id
        jsonb envelope "HAIP 1.0 Message Envelope"
        string status
    }

    ai_outputs {
        uuid id PK
        uuid task_id FK
        text organization_id FK "[EXTENDED] Tổ chức sở hữu kết quả"
        string data_classification "[EXTENDED] Độ nhạy cảm dữ liệu"
        string release_status "[EXTENDED] DRAFT, QA_APPROVED, PUBLIC_APPROVED, REVOKED"
        string output_type
        jsonb content
    }

    ai_policies {
        text id PK "[NEW] Canonical Policy ID"
        string name "Tên chính sách"
        string policy_scope "[NEW] GROUP, ORGANIZATION, DEPARTMENT, AGENT"
        text target_id "[NEW] Trỏ ID đối tượng áp dụng"
        jsonb rules "[NEW] Rào chắn ALLOW/DENY, risk, tools, cross-org"
        integer priority "Độ ưu tiên (số nhỏ = ưu tiên cao)"
        string status "ACTIVE, DISABLED"
    }
```

---

## 2. PHÂN LOẠI CHI TIẾT THÀNH PHẦN KIẾN TRÚC

### 2.1. Nhóm Bảng Mới Bổ Sung `[NEW]`
1. `public.organizations`: Quản lý 6 Business Units đóng băng theo chuẩn holding tập đoàn.
2. `public.departments`: Quản lý 65 phòng ban chuẩn hóa theo mã canonical duy nhất toàn cục.
3. `public.organization_memberships`: Cầu nối phân quyền đa tổ chức cho người dùng (`auth.users`).
4. `public.ai_policies`: Rào chắn chính sách động kiểm soát ủy quyền tác tử và luồng dữ liệu liên tổ chức.

### 2.2. Nhóm Bảng Mở Rộng Cột `[EXTENDED]`
1. `public.agents`:
   - Bổ sung `organization_id` (NOT NULL, FK).
   - Bổ sung `department_id` (NULLable, FK).
   - Bổ sung `hierarchy_level` (smallint, 0 to 4).
   - Bổ sung `cost_center_code` (text, snapshot).
   - Bổ sung `current_agent_version_id` (uuid, FK trỏ vào `agent_versions.id`).
2. `public.agent_versions`:
   - Bổ sung `agent_card` (jsonb, bắt buộc chứa toàn văn đặc tả hợp đồng Agent Card V2).
   - Bổ sung `agent_card_hash` (text, SHA-256 mã hóa nội dung thẻ để bảo đảm tính toàn vẹn bất biến).
   - Đồng bộ `schema_version` đại diện cho phiên bản tài liệu Agent Card (`"2.0"`).
3. `public.ai_tasks`:
   - Bổ sung `organization_id` (NOT NULL, FK).
   - Bổ sung `department_id` (NULLable, FK).
   - Bổ sung `data_classification` (text + CHECK).
   - Bổ sung `cost_center_code` (text, snapshot thời điểm tạo).
   - Bổ sung `requested_by_organization_id` (NULLable, phục vụ truy vết ủy quyền liên tổ chức).
4. `public.ai_task_steps`:
   - Bổ sung `sender_organization_id` (text).
   - Bổ sung `recipient_organization_id` (text).
5. `public.ai_outputs`:
   - Bổ sung `organization_id` (NOT NULL, FK).
   - Bổ sung `data_classification` (text + CHECK).
   - Bổ sung `release_status` (text + CHECK: `DRAFT`, `QA_APPROVED`, `PUBLIC_APPROVED`, `REVOKED`).

### 2.3. Nhóm Bảng Bảo Tồn Nguyên Trạng `[EXISTING]`
- `auth.users`: Quản lý danh tính người dùng của Supabase Auth.
- `public.nodes` & `public.node_heartbeats`: Giữ nguyên mô hình hạ tầng vật lý.
- `public.ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`: Giữ nguyên mô hình registry công cụ và LLM.
- 19 bảng ứng dụng kế thừa (`contacts`, `orders`, `videos`, v.v.): Hoàn toàn không bị xáo trộn.
