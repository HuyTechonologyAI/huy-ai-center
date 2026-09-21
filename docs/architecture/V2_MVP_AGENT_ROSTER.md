# HUY AI AGENCY GROUP V2.0 — MVP AGENT ROSTER SPECIFICATION

**DOCUMENT ID:** V2_MVP_AGENT_ROSTER  
**SYSTEM:** HUY AI AGENCY GROUP V2.0  
**PHASE:** 06J-B (DESIGN-TIME ROSTER FREEZE)  
**TOTAL AGENTS:** EXACTLY 25 LOGICAL AGENTS (NOT SEEDED)  

---

## 1. ROSTER STRUCTURE & INVARIANTS

```text
================================================================================
LEVEL 4: 1 Group Executive Orchestrator (reports_to: null, dept: null)
LEVEL 3: 6 Company Orchestrators (reports_to: agent-group-ceo, dept: null)
LEVEL 2: 9 Department Manager Agents (reports_to: own BU Orchestrator, valid dept)
LEVEL 1: 9 Specialist Agents (reports_to: own Dept Manager, valid dept)
TOTAL  : 25 MVP Logical Agents
================================================================================
```

---

## 2. DETAILED AGENT SPECIFICATIONS

### 2.1 Level 4: Group Executive Orchestrator (1 Agent)
1. **`agent-group-ceo`**  
   - **Role:** Group Executive Orchestrator  
   - **Organization:** `org-01-huytech` | **Department:** `null`  
   - **Reports To:** `null`  
   - **Capabilities:** `group.plan`, `group.delegate`, `group.status.read`, `group.cost.read`, `group.risk.read`  
   - **Model Policy:** Preferred: `MODEL_TIER_3`, Max: `MODEL_TIER_3`, Fallback: `MODEL_TIER_2`  
   - **Risk Ceiling:** Level 3  

### 2.2 Level 3: Company Orchestrators (6 Agents)
2. **`agent-huytech-orchestrator`** (`org-01-huytech`) — Reports to: `agent-group-ceo`  
   - **Capabilities:** `company.plan`, `company.delegate`, `company.status.read`, `company.cost.read` | **Risk Ceiling:** 3
3. **`agent-aischool-orchestrator`** (`org-02-aischool`) — Reports to: `agent-group-ceo`  
   - **Capabilities:** `company.plan`, `company.delegate`, `company.status.read`, `company.cost.read` | **Risk Ceiling:** 3
4. **`agent-smarttax-orchestrator`** (`org-03-smarttax`) — Reports to: `agent-group-ceo`  
   - **Capabilities:** `company.plan`, `company.delegate`, `company.status.read`, `company.cost.read` | **Risk Ceiling:** 3
5. **`agent-media-tech-orchestrator`** (`org-04-media-tech`) — Reports to: `agent-group-ceo`  
   - **Capabilities:** `company.plan`, `company.delegate`, `company.status.read`, `company.cost.read` | **Risk Ceiling:** 3
6. **`agent-media-edu-orchestrator`** (`org-05-media-edu`) — Reports to: `agent-group-ceo`  
   - **Capabilities:** `company.plan`, `company.delegate`, `company.status.read`, `company.cost.read` | **Risk Ceiling:** 3
7. **`agent-media-creative-orchestrator`** (`org-06-media-creative`) — Reports to: `agent-group-ceo`  
   - **Capabilities:** `company.plan`, `company.delegate`, `company.status.read`, `company.cost.read` | **Risk Ceiling:** 3

### 2.3 Level 2: Department Managers (9 Agents)
8. **`agent-huytech-engineering-manager`** (`org-01-huytech`, `dept-01-engineering`) — Reports to: `agent-huytech-orchestrator`
9. **`agent-huytech-security-manager`** (`org-01-huytech`, `dept-01-security`) — Reports to: `agent-huytech-orchestrator`
10. **`agent-aischool-academic-manager`** (`org-02-aischool`, `dept-02-academic`) — Reports to: `agent-aischool-orchestrator`
11. **`agent-aischool-multimedia-manager`** (`org-02-aischool`, `dept-02-multimedia`) — Reports to: `agent-aischool-orchestrator`
12. **`agent-smarttax-tax-manager`** (`org-03-smarttax`, `dept-03-tax-research`) — Reports to: `agent-smarttax-orchestrator`
13. **`agent-smarttax-legal-manager`** (`org-03-smarttax`, `dept-03-legal-research`) — Reports to: `agent-smarttax-orchestrator`
14. **`agent-media-tech-strategy-manager`** (`org-04-media-tech`, `dept-04-strategy`) — Reports to: `agent-media-tech-orchestrator`
15. **`agent-media-edu-strategy-manager`** (`org-05-media-edu`, `dept-05-strategy`) — Reports to: `agent-media-edu-orchestrator`
16. **`agent-media-creative-strategy-manager`** (`org-06-media-creative`, `dept-06-strategy`) — Reports to: `agent-media-creative-orchestrator`

### 2.4 Level 1: Specialist Agents (9 Agents)
17. **`agent-dev-specialist`** (`org-01-huytech`, `dept-01-engineering`) — Reports to: `agent-huytech-engineering-manager`
18. **`agent-security-auditor`** (`org-01-huytech`, `dept-01-security`) — Reports to: `agent-huytech-security-manager`
19. **`agent-lesson-designer`** (`org-02-aischool`, `dept-02-lesson-design`) — Reports to: `agent-aischool-academic-manager`
20. **`agent-assessment-specialist`** (`org-02-aischool`, `dept-02-assessment`) — Reports to: `agent-aischool-academic-manager`
21. **`agent-tax-researcher`** (`org-03-smarttax`, `dept-03-tax-research`) — Reports to: `agent-smarttax-tax-manager`
22. **`agent-legal-citation-verifier`** (`org-03-smarttax`, `dept-03-citation`) — Reports to: `agent-smarttax-legal-manager`
23. **`agent-tech-media-producer`** (`org-04-media-tech`, `dept-04-script`) — Reports to: `agent-media-tech-strategy-manager`
24. **`agent-edu-media-producer`** (`org-05-media-edu`, `dept-05-script`) — Reports to: `agent-media-edu-strategy-manager`
25. **`agent-creative-media-producer`** (`org-06-media-creative`, `dept-06-script`) — Reports to: `agent-media-creative-strategy-manager`

---

## 3. SEEDING & RUNTIME STATUS

- **Production Seeding Status:** **UNSEEDED (0 rows in production `agents` / `agent_versions`)**.
- **Execution Mode:** Configuration is design-time only in `config/architecture/v2/agents.mvp.json`.
- **Database Mapping:** Deferred to Phase 06K.
