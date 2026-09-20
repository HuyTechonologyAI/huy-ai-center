# HAIP ARTIFACT PROTOCOL & STORAGE SPECIFICATION

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Core Mandate: Zero Large Binaries in Message Envelopes

HAIP message envelopes transported via Supabase PGMQ or inter-agent HTTP channels MUST remain lightweight, fast, and compact.
```text
ENVELOPES NEVER CARRY RAW BINARY OR LARGE TEXT FILES.
MESSAGES ONLY TRANSPORT CANONICAL ARTIFACT REFERENCES.
```
Any payload exceeding 32 KB (e.g. multi-page PDFs, high-res images, full slide deck JSON, audio/video recordings) must be written directly to the object storage layer, with only a verifiable reference passed across agents.

---

## 2. Canonical Artifact Reference Structure

Every artifact reference transported in HAIP conforms to the following schema:

```json
{
  "artifact_ref": "art_20260920_7a8b9c",
  "artifact_type": "slide_deck_pptx",
  "version": "1.0.0",
  "checksum": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "storage_location": "supabase-storage://ai-artifacts/2026/09/lesson_plan_5.pptx",
  "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "size_bytes": 1458920,
  "metadata": {
    "task_id": "33333333-3333-4333-8333-333333333333",
    "generator_agent": "teacher-ai-node-01",
    "pages_count": 12
  }
}
```

---

## 3. Storage Hierarchy & Backends

| Backend | Bucket / Location | Access Mode | Intended Content |
|---|---|---|---|
| **Supabase Storage** | `ai-artifacts` | Signed URL (Private) | Generated documents, PPTX, PDFs, final student materials |
| **Supabase Storage** | `ai-public-assets` | Public CDN | Thumbnails, public diagrams, exportable worksheets |
| **Local Dell Scratch** | `/var/lib/huy-ai/scratch/` | Local POSIX | Intermediate build files, temporary audio wavs, render frames |

---

## 4. Artifact Lifecycle & Integrity Flow

1. **Generation:** Worker Agent generates output (e.g. Python script in MCP generates PPTX).
2. **Storage Ingestion:** File is written to `ai-artifacts` bucket via Supabase Storage API.
3. **Checksum Verification:** SHA-256 hash is computed and recorded.
4. **Reference Emission:** Worker emits `RESULT` message with `artifact_ref` object.
5. **QA Verification:** QA Reviewer fetches the artifact using a temporary signed URL, validates file integrity against the checksum, and performs content inspection.
6. **Final Persistence:** Upon task completion, artifact reference metadata is recorded in `public.ai_outputs.metadata`.

---

## 5. Security & Retention Policy

- **Signed URLs:** Client browsers access private artifacts exclusively via HMAC-SHA256 signed URLs with a maximum 1-hour expiration.
- **Retention:**
  - Production artifacts: Retained indefinitely or per user subscription quota.
  - Intermediate / Scratch artifacts: Automatically purged after 48 hours via storage lifecycle policy.
