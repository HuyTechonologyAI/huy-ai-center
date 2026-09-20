# HAIP HUMAN APPROVAL GATE SPECIFICATION

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Objective & Philosophy

Autonomous multi-agent orchestration must free human operators from micro-managing individual worker steps, while strictly maintaining human authority over high-risk, irreversible, or costly decisions.

### Core Principles:
1. **Zero Micro-Management for Low Risk:** Tasks with Risk Level 0, 1, and 2 execute autonomously through the Worker $\rightarrow$ QA $\rightarrow$ Finalizer loop without blocking on human prompts.
2. **Deterministic Gates for High Risk:** Tasks with Risk Level $\ge 3$, budget exhaustion, or explicit policy locks MUST halt and await explicit human approval.
3. **Executive Summary UI:** Humans are presented with high-level summaries, candidate artifacts, QA scores, risks, and financial impacts—**never internal agent-to-agent chatter**.

---

## 2. When Human Approval is Required

An `APPROVAL_REQUEST` envelope is triggered if and only if:
- **Risk Level $\ge 3$:** Any production write, external email dispatch, or staging-to-production deployment.
- **Risk Level 4:** Any financial transaction, database deletion, or DNS change (mandatory double-confirmation).
- **Budget Exhaustion:** Accumulated tokens or dollars reach the envelope's ceiling before task completion.
- **QA Escalation:** QA Reviewer rejected the output and `review_cycles` has reached `max_review_cycles` (default 2).
- **Policy Flag:** Task envelope contains explicit constraint `"require_human_gate": true`.

---

## 3. Approval Request Contract

When a gate is activated, the Dispatcher creates an approval package:
```json
{
  "approval_id": "appr-1234-5678-90ab",
  "task_id": "33333333-3333-4333-8333-333333333333",
  "risk_level": 3,
  "summary": "Phê duyệt xuất bản giáo án điện tử lên cổng thông tin giáo viên (gvcncdsai.io.vn)",
  "candidate_output_ref": "art-9876-5432-10fe",
  "qa_status": {
    "verdict": "PASS",
    "score": 0.94,
    "reviewed_by": "qa-reviewer-01",
    "notes": "Tuân thủ đầy đủ chuẩn kiến thức kỹ năng môn Toán 10. Không vi phạm chính sách an toàn."
  },
  "cost_incurred_usd": 0.012,
  "requested_action": "WRITE_PRODUCTION_CMS",
  "warnings": [
    "Hành động này sẽ cập nhật trực tiếp nội dung trên website chính thức."
  ],
  "expires_at": "2026-09-21T21:30:00Z"
}
```

---

## 4. Supported Operator Decisions

The human operator submits one of exactly three decisions:

### 1. `APPROVE`
- **Effect:** Task transitions from `AWAITING_APPROVAL` to `APPROVED`.
- **Action:** Dispatcher executes the authorized finalization step (e.g. committing production write or releasing artifact).
- **Audit:** Operator user ID, email, timestamp, and signature logged to `audit_logs.details`.

### 2. `REJECT`
- **Effect:** Task transitions to `CANCELLED`.
- **Action:** Execution aborted immediately; downstream DAG branches cancelled. All allocated temporary resources released.
- **Audit:** Reason for rejection recorded in audit log.

### 3. `REQUEST_REVISION`
- **Effect:** Task transitions to `CORRECTING`.
- **Action:** Human feedback comments are encapsulated in a `CORRECTION` message and routed back to the Worker Agent.
- **Limits:** Revisions reset the worker with an incremented review cycle counter.

---

## 5. User Interface (UI) Experience

In the Control Center Web Application (`apps/control-center`), the Approval Modal displays:
- **Header:** Task Title, App Source, Priority Badge, Risk Badge (`LEVEL 3 — PRODUCTION WRITE`).
- **Executive Summary:** Plain-language summary of what was generated.
- **Artifact Viewer:** Live preview of the generated Markdown, JSON, or Slide layout.
- **QA Scorecard:** Green/Amber/Red badges showing QA verification items.
- **Cost & Resource Bar:** Cost in USD ($\$0.012$), Tokens used ($3,120$), Compute Node (`huy-ai-node-01`).
- **Action Buttons:**
  - `[Phê duyệt & Xuất bản]` (Green, Primary)
  - `[Yêu cầu chỉnh sửa]` (Amber, opens feedback input)
  - `[Từ chối / Hủy]` (Red, destructive confirmation)
