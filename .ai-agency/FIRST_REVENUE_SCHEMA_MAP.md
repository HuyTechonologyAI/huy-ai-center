# FIRST REVENUE SCHEMA MAP — REV3-002
**Generated at:** 2026-10-01T12:15:40.166Z  
**Target Database:** Supabase HuyAI Singapore (`bdeluacbzbdflxubhpha`)  
**Principle:** REUSE > EXTEND > CREATE (No duplicate CRM)  

| Logical Entity | Existing Physical Table | Status in DB | Mapping & Strategy |
|---|---|:---:|---|
| **campaign** | `ai_tasks` (task_type = FIRST_REVENUE.CAMPAIGN) | EXISTS | REUSE: Gắn với campaign_id = `FIRST-REVENUE-V3` |
| **lead** | `first_revenue_leads` | EXISTS | CREATE / EXTEND: Lưu name, company, role, email, phone, problem |
| **consent** | `first_revenue_consents` | EXISTS | CREATE: Lưu consent flag, timestamp, consent text version |
| **interaction** | `first_revenue_interactions` | EXISTS | CREATE: Lưu channel, direction (INBOUND/OUTBOUND), content |
| **qualification** | `ai_outputs` / JSONB | EXISTS | REUSE: Store in `ai_outputs` linked to lead_id |
| **audit** | `ai_task_steps` (step_type = AUDIT) | EXISTS | REUSE: Store in `ai_task_steps` |
| **proposal** | `ai_outputs` (output_type = PROPOSAL) | EXISTS | REUSE: Fixed SKU HUY-AUTO-PILOT-4900 (4,900,000 VND) |
| **order** | `first_revenue_orders` | EXISTS | CREATE: Lưu order_id, agreed_price (4.9M), status, customer_accepted |
| **payment_transaction** | `first_revenue_payment_transactions` | EXISTS | CREATE: SePay webhook payload, transaction_id, code, match_status |
| **evidence_event** | `first_revenue_evidence_events` | EXISTS | CREATE: Immutable event store, content_hash, timestamp |
| **agent_run** | `ai_task_steps` | EXISTS | REUSE: Track A1, A2, A3 agent runs |
| **checkpoint** | `ai_checkpoints` | EXISTS | REUSE: Append-only checkpoints with SHA and evidence |
| **learning_example** | `ai_outputs` (output_type = LEARNING) | EXISTS | REUSE: Evaluated training candidates |
