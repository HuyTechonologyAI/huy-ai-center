# HUY AI AGENCY GROUP V2.0 — TOOL PERMISSION MODEL

**DOCUMENT ID:** V2_TOOL_PERMISSION_MODEL  
**SYSTEM:** HUY AI AGENCY GROUP V2.0  
**PHASE:** 06J-B (TOOL PERMISSION SPECIFICATION)  
**STATUS:** FROZEN CANONICAL MODEL  

---

## 1. ABSTRACT TOOL PERMISSION MODEL

To maintain strict agent containment, agents do not receive direct access to host shell or unrestricted database sockets. Instead, capabilities bind to **Abstract Tool Permissions** mediated by the Model Context Protocol (MCP) and verified by the Policy Guard before invocation.

---

## 2. TOOL PERMISSIONS CATALOG & RISK CLASSIFICATION

| Permission ID | Risk Level | Sensitive | Operational Scope & Constraint |
|:---|:---:|:---:|:---|
| `tool.web.search` | 0 | No | Search public web engines for non-sensitive public reference |
| `tool.db.read` | 0 | No | Read authorized tables via scoped MCP PostgreSQL adapter |
| `tool.db.write` | 3 | **YES** | Mutate database records (INSERT/UPDATE/DELETE). Gated by Human Approval |
| `tool.docs.parse` | 0 | No | Parse unstructured files via Docling / OCR |
| `tool.storage.read` | 0 | No | Read artifacts from authorized storage namespaces |
| `tool.storage.write`| 1 | No | Write intermediate artifacts to task scratchpad / staging buckets |
| `tool.codegen` | 1 | No | Generate code files in temporary sandbox environment |
| `tool.test` | 2 | No | Execute test suites and linters in isolated Docker container |
| `tool.deploy.prepare`| 2 | No | Assemble container images and deployment manifests |
| `tool.deploy.execute`| 3 | **YES** | Deploy workloads to production nodes (`huy-ai-node-01`). Gated by Human |
| `tool.media.image` | 1 | No | Generate graphic thumbnails and diagrams |
| `tool.media.video` | 2 | No | Render video clips via on-premise FFmpeg tool |
| `tool.media.audio` | 1 | No | Generate voiceover narration or music stems |
| `tool.social.prepare`| 1 | No | Draft social media posts, descriptions, and hashtags |
| `tool.social.publish`| 3 | **YES** | Dispatch public posts to live social platforms. Gated by Human |
| `tool.email.prepare` | 1 | No | Draft outbound email bodies and newsletters |
| `tool.email.send` | 3 | **YES** | Send emails to external clients/recipients. Gated by Human |
| `tool.github.read` | 0 | No | Read issues, pull requests, and repository metadata |
| `tool.github.write`| 3 | **YES** | Commit code, merge PRs, or modify settings. Gated by Human |
| `tool.system.health.read`| 0 | No | Read CPU, RAM, and queue telemetry |
| `tool.system.admin` | 4 | **YES** | Rotate secrets, manage master keys. Dual Human Owner Approval required |

---

## 3. INVIOLABLE RULES FOR SENSITIVE PERMISSIONS

> [!CAUTION]
> **Zero Implicit Grant of Sensitive Tool Permissions:**  
> The 6 sensitive permissions (`tool.db.write`, `tool.deploy.execute`, `tool.social.publish`, `tool.email.send`, `tool.github.write`, `tool.system.admin`) must **NEVER** be implicitly granted by agent role or inheritance. They must be explicitly declared in the Agent Card, validated by the Policy Guard, and approved by a verified human before execution.
