# HUY TECHNOLOGY AI CENTER — PRE-APPLY PRODUCTION DATABASE SNAPSHOT

**Date & Time:** 2026-09-20T21:23:00+07:00  
**Target Supabase Project:** HuyAI  
**Project Ref:** `bdeluacbzbdflxubhpha`  
**Region:** Singapore (ap-southeast-1)  
**Architecture:** HUY TECHNOLOGY AI CENTER V1.1 (Cost-Optimized Unified Architecture)  
**Phase:** 06E — Controlled Production Migration Apply  

---

## 1. Executive Summary

This snapshot establishes the immutable pre-apply baseline of the live production database `HuyAI` before applying the versioned migrations 1 through 5.
In strict adherence to the **Zero-Touch Safety Directive**, no existing tables, columns, or data rows will be altered or dropped.

---

## 2. Live Existing Table Inventory & Row Counts (Baseline)

Exact inventory of all 19 existing tables in schema `public` with verified live row counts:

| # | Table Name | Live Row Count | Role / Classification | Baseline Integrity Requirement |
|---|------------|----------------|-----------------------|---------------------------------|
| 1 | `contacts` | 0 | Legacy EdTech CRM | Zero alteration, preserve structure |
| 2 | `videos` | 1 | EdTech Course Content | Zero alteration, preserve 1 row |
| 3 | `resources` | 1 | EdTech Digital Assets | Zero alteration, preserve 1 row |
| 4 | `resource_views` | 31 | EdTech Analytics | Zero alteration, preserve 31 rows |
| 5 | `premium_contents` | 0 | EdTech Monetization | Zero alteration, preserve structure |
| 6 | `item_reviews` | 0 | EdTech Feedback | Zero alteration, preserve structure |
| 7 | `audit_logs` | 0 | Governance / Security | Zero alteration (Zero DDL per Step 0) |
| 8 | `user_activity_metrics` | 20 | EdTech Telemetry | Zero alteration, preserve 20 rows |
| 9 | `student_points_balance` | 3 | Gamification / Points | Zero alteration, preserve 3 rows |
| 10 | `daily_tasks` | 0 | Gamification Quests | Zero alteration, preserve structure |
| 11 | `task_completions` | 0 | Gamification History | Zero alteration, preserve structure |
| 12 | `cms_folders` | 2 | Content Management | Zero alteration, preserve 2 rows |
| 13 | `orders` | 177 | Payment / E-commerce | Zero alteration, preserve 177 rows |
| 14 | `cms_settings` | 3 | CMS Configuration | Zero alteration, preserve 3 rows |
| 15 | `knowledge_chunks` | 0 | RAG / Embeddings | Zero alteration, preserve structure |
| 16 | `user_video_progress` | 0 | LMS Progress Tracking | Zero alteration, preserve structure |
| 17 | `user_document_progress` | 0 | LMS Progress Tracking | Zero alteration, preserve structure |
| 18 | `leads` | 0 | Sales Pipeline | Zero alteration, preserve structure |
| 19 | `site_content` | 1 | Web Landing Content | Zero alteration, preserve 1 row |

**Total Existing Tables:** 19  
**Total Production Rows Across Existing Tables:** 239 rows  

---

## 3. Database Extension Status Baseline

| Extension Name | Live Pre-Apply State | Target Migration Action |
|----------------|----------------------|-------------------------|
| `uuid-ossp` / `pgcrypto` | Active / Installed | Retain, used for UUID generation |
| `vector` (`pgvector`) | Installed (v0.8.0) | Retain, used for vector embeddings |
| `pgmq` | Available (v1.5.1), Not Installed | Install via Migration 5 (`CREATE EXTENSION IF NOT EXISTS pgmq`) |

---

## 4. Legacy Security & Performance Baseline

Live audit identified the following pre-existing legacy conditions on `HuyAI`:

### 4.1 Legacy RLS Warnings Baseline (4 tables)
- `cms_settings`: RLS enabled, 0 policies defined
- `leads`: RLS enabled, 0 policies defined
- `user_document_progress`: RLS enabled, 0 policies defined
- `user_video_progress`: RLS enabled, 0 policies defined

*Baseline Note: These 4 tables belong to the legacy EdTech application. They are NOT modified during Phase 06E to prevent any breaking changes to existing client code.*

### 4.2 Legacy Function Mutable search_path Warning (1 function)
- `public.set_updated_at`: Missing explicit `SET search_path = public, pg_temp;`.

*Baseline Note: This trigger function belongs to legacy schema. All newly created functions in Phase 06E (e.g., `claim_ai_task`) explicitly set `search_path = public, pg_temp` and use `SECURITY DEFINER`.*

---

## 5. Target Migration Delta Specification

| Metric | Pre-Apply Baseline | Target Post-Apply State | Net Change |
|--------|--------------------|-------------------------|------------|
| **Public Tables** | 19 | 34 | +15 new tables |
| **Existing Tables Modified** | 0 | 0 | **0 (Zero DDL)** |
| **Installed Extensions** | pgvector | pgvector, pgmq | +1 extension (`pgmq`) |
| **Message Queue** | None | PGMQ Basic Durable Queue (`ai-jobs`) | +1 durable queue |
| **Infrastructure Seed** | None | `huy-ai-node-01` (Dell M4800) | +1 row in `nodes` |
| **Catalog Seeds** | 0 | 0 | 0 (Strictly deferred to admin runtime) |

### List of 15 New Tables to be Created:
1. `public.ai_tasks` (AI Operations)
2. `public.ai_task_steps` (AI Operations)
3. `public.ai_outputs` (AI Operations)
4. `public.nodes` (Infrastructure)
5. `public.node_heartbeats` (Infrastructure)
6. `public.ai_providers` (AI Registry)
7. `public.ai_models` (AI Registry)
8. `public.tools` (AI Registry)
9. `public.tool_versions` (AI Registry)
10. `public.tool_capabilities` (AI Registry)
11. `public.agents` (AI Registry)
12. `public.agent_versions` (AI Registry)
13. `public.github_projects` (GitHub Radar)
14. `public.github_reviews` (GitHub Radar)
15. `public.github_versions` (GitHub Radar)

---
*Snapshot locked and recorded. Ready for controlled sequential migration apply.*
