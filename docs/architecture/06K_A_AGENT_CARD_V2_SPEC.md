# ĐẶC TẢ THẺ TÁC TỬ TOÀN DIỆN V2 (AGENT CARD V2 SPECIFICATION)
## PHASE 06K-A.1 — AGENT CONTRACT & IMMUTABLE PERSISTENCE DESIGN (RECONCILED)

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Hệ thống:** HUY AI CENTER / HAIP CONTROL PLANE  
**Phiên bản Schema Thẻ Tác tử:** `2.0` (HAIP Agent Card V2 Specification)  
**Nguyên tắc cốt lõi:** THẺ TÁC TỬ LÀ HỢP ĐỒNG PHÁP LÝ & KỸ THUẬT BẤT BIẾN (CANONICAL IMMUTABLE CONTRACT)  

> **CORRECTION NOTE (06K-A.1):** Sample card replaced with canonical MVP agent `agent-tax-researcher`. Type corrections: `risk.ceiling` and `agents.risk_ceiling` are `integer` (0–4), not string `"R2"`. Org enum verified correct.

---

## 1. NGUYÊN TẮC THIẾT KẾ AGENT CARD V2

1. **Thẩm quyền đến từ Chính sách (Authority from Policy):** Cấp bậc tác tử và thẩm quyền ra quyết định không phụ thuộc vào trí thông minh của mô hình nền (Model intelligence), mà được giới hạn tuyệt đối bởi hợp đồng Agent Card và chính sách tập đoàn.
2. **Bất biến theo Phiên bản (Version Immutability):** Mỗi lần nâng cấp năng lực tác tử là một phiên bản SemVer mới (`version: "1.0.0"` -> `"1.1.0"`). Bản ghi cũ không bao giờ bị ghi đè hay chỉnh sửa.
3. **Phân tách Rõ ràng:**
   - `schema_version`: Phiên bản cấu trúc của tài liệu Agent Card (`"2.0"`).
   - `version`: Phiên bản triển khai nghiệp vụ của tác tử (`"1.0.0"`).
   - `agent_card`: Hợp đồng hoàn chỉnh đầy đủ (Single Source of Truth).
   - `configuration`: Cấu hình vận hành động cấp độ operator (nhiệt độ LLM, timeout, retry limits).
   - `metadata`: Chú thích phi quy chuẩn, nhãn theo dõi.

---

## 2. CANONICAL JSON SCHEMA — AGENT CARD V2

Dưới đây là cấu trúc JSON Schema chuẩn hóa cho toàn bộ 25 tác tử MVP trong Hệ sinh thái HUY AI:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "HAIP_Agent_Card_V2",
  "type": "object",
  "required": [
    "schema_version",
    "agent_id",
    "version",
    "display_name",
    "identity",
    "role",
    "description",
    "capabilities",
    "accepted_inputs",
    "output_types",
    "runtime",
    "risk",
    "cost",
    "delegation",
    "tool_access",
    "approval",
    "provenance"
  ],
  "properties": {
    "schema_version": {
      "type": "string",
      "const": "2.0",
      "description": "Phiên bản tài liệu cấu trúc thẻ Agent Card"
    },
    "agent_id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Mã định danh duy nhất của tác tử logic (e.g. 'agent-01-group-orchestrator')"
    },
    "version": {
      "type": "string",
      "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$",
      "description": "Phiên bản phát hành SemVer (e.g. '1.0.0')"
    },
    "display_name": {
      "type": "string",
      "minLength": 3,
      "maxLength": 100,
      "description": "Tên định danh hiển thị của tác tử"
    },
    "identity": {
      "type": "object",
      "required": ["organization_id", "hierarchy_level"],
      "properties": {
        "organization_id": {
          "type": "string",
          "enum": [
            "org-01-huytech",
            "org-02-aischool",
            "org-03-smarttax",
            "org-04-media-tech",
            "org-05-media-edu",
            "org-06-media-creative"
          ]
        },
        "department_id": {
          "type": ["string", "null"],
          "description": "ID phòng ban chủ quản (nullable cho L4 Group Orchestrator)"
        },
        "hierarchy_level": {
          "type": "integer",
          "minimum": 0,
          "maximum": 4,
          "description": "4=Group Executive, 3=Company Orchestrator, 2=Dept Manager, 1=Specialist, 0=Tool Worker"
        }
      }
    },
    "role": {
      "type": "string",
      "description": "Chức danh nghiệp vụ (e.g. 'Group Orchestration Director')"
    },
    "description": {
      "type": "string",
      "description": "Mô tả chi tiết mục tiêu và phạm vi hành động của tác tử"
    },
    "capabilities": {
      "type": "array",
      "items": { "type": "string", "pattern": "^[a-z0-9_.-]+$" },
      "uniqueItems": true,
      "description": "Danh mục năng lực chuẩn hóa (dot-separated format, e.g. 'tax.invoice.ocr')"
    },
    "accepted_inputs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "description"],
        "properties": {
          "type": { "type": "string" },
          "schema_ref": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "output_types": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "description"],
        "properties": {
          "type": { "type": "string" },
          "schema_ref": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "runtime": {
      "type": "object",
      "required": ["preferred_model_tier", "execution_environment"],
      "properties": {
        "preferred_model_tier": {
          "type": "string",
          "enum": ["MODEL_TIER_0", "MODEL_TIER_1", "MODEL_TIER_2", "MODEL_TIER_3", "MODEL_TIER_4"]
        },
        "execution_environment": {
          "type": "string",
          "enum": ["NODE_LOCAL", "EDGE_SERVERLESS", "CONTAINER_SANDBOX"]
        },
        "timeout_seconds": { "type": "integer", "default": 300 },
        "max_retries": { "type": "integer", "default": 3 }
      }
    },
    "risk": {
      "type": "object",
      "required": ["ceiling", "allowed_data_classifications"],
      "properties": {
        "ceiling": {
          "type": "integer",
          "minimum": 0,
          "maximum": 4,
          "description": "R0=Read/Summarize, R1=Draft, R2=Sandbox, R3=Prod Write, R4=Financial/Destructive"
        },
        "allowed_data_classifications": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]
          },
          "uniqueItems": true
        }
      }
    },
    "cost": {
      "type": "object",
      "required": ["cost_center_code", "maximum_cost_tier"],
      "properties": {
        "cost_center_code": {
          "type": "string",
          "pattern": "^CC-0[1-6]-[A-Z-]+$"
        },
        "maximum_cost_tier": {
          "type": "string",
          "enum": ["T0", "T1", "T2", "T3", "T4"]
        }
      }
    },
    "delegation": {
      "type": "object",
      "required": ["can_delegate", "allowed_recipient_levels", "allowed_recipient_organizations"],
      "properties": {
        "can_delegate": { "type": "boolean" },
        "allowed_recipient_levels": {
          "type": "array",
          "items": { "type": "integer", "minimum": 0, "maximum": 4 }
        },
        "allowed_recipient_organizations": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "tool_access": {
      "type": "object",
      "required": ["allowed_tools", "allowed_capabilities"],
      "properties": {
        "allowed_tools": { "type": "array", "items": { "type": "string" } },
        "allowed_capabilities": { "type": "array", "items": { "type": "string" } }
      }
    },
    "policy_refs": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Danh mục mã ID chính sách áp dụng bắt buộc"
    },
    "approval": {
      "type": "object",
      "required": ["human_required_for"],
      "properties": {
        "human_required_for": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Danh mục điều kiện bắt buộc Human-in-the-Loop (ví dụ: 'R3_PROD_DEPLOY', 'TAX_SUBMISSION')"
        }
      }
    },
    "constraints": {
      "type": "object",
      "properties": {
        "max_daily_budget_usd": { "type": "number" },
        "disallowed_external_domains": { "type": "array", "items": { "type": "string" } }
      }
    },
    "provenance": {
      "type": "object",
      "required": ["author", "created_at", "commit_hash"],
      "properties": {
        "author": { "type": "string" },
        "created_at": { "type": "string", "format": "date-time" },
        "commit_hash": { "type": "string" }
      }
    }
  }
}
```

---

## 3. CANONICAL MVP SAMPLE: SMARTTAX TAX RESEARCHER (L1)

> **Agent ID:** `agent-tax-researcher` — SmartTax AI (org-03-smarttax), Hierarchy Level 1 (Specialist)

```json
{
  "schema_version": "2.0",
  "agent_id": "agent-tax-researcher",
  "version": "1.0.0",
  "display_name": "SmartTax Tax Researcher",
  "identity": {
    "organization_id": "org-03-smarttax",
    "department_id": "dept-03-tax-research",
    "hierarchy_level": 1
  },
  "role": "Chuyên viên Nghiên cứu Văn bản Pháp luật Thuế",
  "description": "Tra cứu, phân tích và tổng hợp văn bản quy phạm pháp luật về thuế (Thông tư, Nghị định, Công văn) của Bộ Tài chính và Tổng cục Thuế Việt Nam. Trả lời câu hỏi nghiệp vụ về chính sách thuế hiện hành.",
  "capabilities": [
    "tax.research.circular",
    "tax.research.decree",
    "tax.research.official_letter",
    "tax.policy.summarize",
    "tax.compliance.check"
  ],
  "accepted_inputs": [
    {
      "type": "text/plain",
      "description": "Câu hỏi nghiệp vụ thuế bằng tiếng Việt"
    },
    {
      "type": "application/json",
      "schema_ref": "schema://smarttax/tax-query-v1.json",
      "description": "Cấu trúc truy vấn nghiệp vụ thuế chuẩn hóa"
    }
  ],
  "output_types": [
    {
      "type": "application/json",
      "schema_ref": "schema://smarttax/tax-research-result-v1.json",
      "description": "Kết quả nghiên cứu pháp luật thuế: trích dẫn văn bản, phân tích, kết luận áp dụng"
    }
  ],
  "runtime": {
    "preferred_model_tier": "MODEL_TIER_2",
    "execution_environment": "NODE_LOCAL",
    "timeout_seconds": 240,
    "max_retries": 3
  },
  "risk": {
    "ceiling": 1,
    "allowed_data_classifications": [
      "INTERNAL",
      "CONFIDENTIAL",
      "RESTRICTED"
    ]
  },
  "cost": {
    "cost_center_code": "CC-03-SMARTTAX",
    "maximum_cost_tier": "T2"
  },
  "delegation": {
    "can_delegate": false,
    "allowed_recipient_levels": [],
    "allowed_recipient_organizations": []
  },
  "tool_access": {
    "allowed_tools": [
      "tool-kb-search-smarttax",
      "tool-pdf-reader"
    ],
    "allowed_capabilities": [
      "storage.read.secure",
      "knowledge.search.tax"
    ]
  },
  "policy_refs": [
    "pol-smarttax-boundary-01",
    "pol-vietnam-tax-compliance-2026"
  ],
  "approval": {
    "human_required_for": [
      "NOVEL_INTERPRETATION_REQUIRED",
      "CONFLICTING_REGULATORY_REFERENCES"
    ]
  },
  "constraints": {
    "max_daily_budget_usd": 5.0,
    "disallowed_external_domains": ["*"]
  },
  "provenance": {
    "author": "Huy Technology AI Lead Architect",
    "created_at": "2026-09-22T22:00:00Z",
    "commit_hash": "62f0246de009f1f9b796297fec7ddf494946a567"
  }
}
```

---

## 4. CHIẾN LƯỢC LƯU TRỮ VÀ TÍNH BẤT BIẾN (PERSISTENCE & IMMUTABILITY)

### 4.1. Cơ chế Lưu trữ Cơ sở Dữ liệu
1. **Lưu trữ toàn văn:** Tài liệu JSON Agent Card V2 được lưu trực tiếp vào cột `agent_card jsonb` của bảng `public.agent_versions`.
2. **Khóa băm kiểm toán:** Cột `agent_card_hash text` chứa mã băm SHA-256 tính toán từ chuỗi JSON được chuẩn hóa (canonical serialized JSON) trước khi nạp. Bất kỳ sự sai khác nào giữa hash và nội dung sẽ bị Dispatcher từ chối nạp vào runtime.
3. **Phép chiếu quan hệ (Relational Projections):** Các trường thường dùng như `capabilities`, `risk_ceiling`, `runtime` được lưu đồng thời ở các cột SQL độc lập để phục vụ index và câu lệnh query của Dispatcher, nhưng `agent_card` luôn là Nguồn Chân lý Tối cao (Source of Truth).

### 4.2. Bảo đảm Tính Bất biến (Immutability Guarantee)
- **Ràng buộc duy nhất:** `UNIQUE (agent_id, version)` ngăn chặn tạo 2 bản ghi trùng phiên bản.
- **Quy tắc Trigger (Khuyến nghị cho 06K-B):**
  ```sql
  -- Thiết kế Trigger chống UPDATE / DELETE bản ghi agent_versions đã kích hoạt
  CREATE OR REPLACE FUNCTION trg_prevent_agent_version_mutation()
  RETURNS TRIGGER AS $$
  BEGIN
      IF TG_OP = 'UPDATE' THEN
          RAISE EXCEPTION 'CANNOT_MUTATE_IMMUTABLE_AGENT_VERSION: Bản ghi agent_versions %-% là bất biến.', OLD.agent_id, OLD.version;
      ELSIF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'CANNOT_DELETE_IMMUTABLE_AGENT_VERSION: Không được xóa lịch sử phiên bản tác tử.';
      END IF;
      RETURN NULL;
  END;
  $$ LANGUAGE plpgsql;
  ```
