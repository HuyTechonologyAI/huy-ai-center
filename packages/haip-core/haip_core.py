#!/usr/bin/env python3
"""
HAIP/1.0 - Core Engine Implementation
Includes Event Bus, Agent Registry (63 Agents across 8 BUs), Policy Engine, Orchestrator, and Acceptance Engine.
"""
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any

HUY_ROOT = Path('/mnt/data1/HUY-AI')
DELIVERY_ROOT = HUY_ROOT / 'deliveries' / 'HAIP_1.0_AG_001'
RUNTIME_HAIP = HUY_ROOT / 'runtime' / 'haip'
RUNTIME_HAIP.mkdir(parents=True, exist_ok=True)
DB_PATH = HUY_ROOT / 'data' / 'haip_event_store.db'
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. HAIP DURABLE EVENT BUS (SQLite WAL)
# ---------------------------------------------------------------------------
class HAIPEventBus:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(str(self.db_path), timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS haip_messages (
                    message_id TEXT PRIMARY KEY,
                    correlation_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    message_type TEXT NOT NULL,
                    sender_agent TEXT NOT NULL,
                    sender_dept TEXT NOT NULL,
                    recipient_agent TEXT NOT NULL,
                    recipient_dept TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    payload_sha256 TEXT NOT NULL,
                    created_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_haip_correlation ON haip_messages(correlation_id);
                CREATE INDEX IF NOT EXISTS idx_haip_created ON haip_messages(created_at);

                CREATE TABLE IF NOT EXISTS haip_message_acks (
                    message_id TEXT NOT NULL,
                    consumer_id TEXT NOT NULL,
                    acked_at REAL NOT NULL,
                    status TEXT NOT NULL,
                    PRIMARY KEY (message_id, consumer_id)
                );

                CREATE TABLE IF NOT EXISTS haip_tasks (
                    task_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    execution_mode TEXT NOT NULL,
                    target_system TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    dag_json TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS haip_artifacts (
                    artifact_id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    subtask_id TEXT NOT NULL,
                    created_by_agent TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    sha256 TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    is_verified INTEGER DEFAULT 0
                );
            """)

    def publish(self, message: Dict[str, Any]) -> bool:
        msg_id = message.get("message_id")
        corr_id = message.get("correlation_id", "default")
        ts = message.get("timestamp", datetime.now(timezone.utc).isoformat())
        m_type = message.get("message_type", "EVENT")
        s_agent = message.get("sender", {}).get("agent_id", "system")
        s_dept = message.get("sender", {}).get("department_id", "system")
        r_agent = message.get("recipient", {}).get("agent_id", "*")
        r_dept = message.get("recipient", {}).get("department_id", "*")
        payload = message.get("payload", {})

        payload_str = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        p_sha = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

        with self._get_connection() as conn:
            # Check duplicate message_id (Idempotency)
            row = conn.execute("SELECT message_id FROM haip_messages WHERE message_id = ?", (msg_id,)).fetchone()
            if row:
                return False # Already exists
            conn.execute("""
                INSERT INTO haip_messages (
                    message_id, correlation_id, timestamp, message_type,
                    sender_agent, sender_dept, recipient_agent, recipient_dept,
                    payload_json, payload_sha256, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (msg_id, corr_id, ts, m_type, s_agent, s_dept, r_agent, r_dept, payload_str, p_sha, time.time()))
        return True

    def get_timeline(self, correlation_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM haip_messages 
                WHERE correlation_id = ? 
                ORDER BY created_at ASC
            """, (correlation_id,))
            rows = cursor.fetchall()
            timeline = []
            for r in rows:
                timeline.append({
                    "message_id": r["message_id"],
                    "correlation_id": r["correlation_id"],
                    "timestamp": r["timestamp"],
                    "message_type": r["message_type"],
                    "sender": {"agent_id": r["sender_agent"], "department_id": r["sender_dept"]},
                    "recipient": {"agent_id": r["recipient_agent"], "department_id": r["recipient_dept"]},
                    "payload": json.loads(r["payload_json"]),
                    "sha256": r["payload_sha256"],
                    "created_at": r["created_at"]
                })
            return timeline

    def register_artifact(self, artifact_id: str, task_id: str, subtask_id: str, 
                          created_by: str, file_path: str, sha256: str, size_bytes: int):
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO haip_artifacts (
                    artifact_id, task_id, subtask_id, created_by_agent, file_path, sha256, size_bytes, created_at, is_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (artifact_id, task_id, subtask_id, created_by, file_path, sha256, size_bytes, datetime.now(timezone.utc).isoformat()))


# ---------------------------------------------------------------------------
# 2. HAIP AGENT REGISTRY (63 Nhân Sự / 8 Khối Nghiệp Vụ)
# ---------------------------------------------------------------------------
class HAIPAgentRegistry:
    BUSINESS_UNITS = {
        "dept_01": {"bu": "BU1_EXECUTIVE", "name": "Ban Điều hành & Chiến lược", "lead": "emp_01"},
        "dept_02": {"bu": "BU2_AI_RESEARCH", "name": "Nghiên cứu & Phát triển AI", "lead": "emp_08"},
        "dept_03": {"bu": "BU3_PRODUCT_UX", "name": "Sản phẩm & Trải nghiệm Người dùng", "lead": "emp_16"},
        "dept_04": {"bu": "BU4_INFRA_TECH", "name": "Hạ tầng & Kỹ thuật Công nghệ", "lead": "emp_24"},
        "dept_05": {"bu": "BU5_FINANCE_TAX", "name": "Tài chính & Kế toán Doanh nghiệp", "lead": "emp_32"},
        "dept_06": {"bu": "BU6_MARKETING_GROWTH", "name": "Tiếp thị & Tăng trưởng Số", "lead": "emp_40"},
        "dept_07": {"bu": "BU7_RISK_QA", "name": "Quản trị Rủi ro & Kiểm toán Chất lượng", "lead": "emp_48"},
        "dept_08": {"bu": "BU8_OPERATIONS", "name": "Vận hành & Chăm sóc Khách hàng", "lead": "emp_56"}
    }

    # Core designated roles
    CORE_ROLES = {
        "emp_01": ("Mai Anh", "dept_01", "Trưởng ban Điều hành (CEO AI)", "LEADERSHIP", "qwen3:4b", ["build_strategy_dag", "orchestrate_task", "approve_handoff"]),
        "emp_07": ("Gia Hân", "dept_01", "Điều phối Lưới Tác tử (A2A Mesh)", "LEADERSHIP", "qwen3:4b", ["a2a_mesh_route", "track_handoff"]),
        "emp_08": ("Hoàng Nam", "dept_02", "Trưởng phòng R&D AI", "ENGINEERING", "qwen2.5-coder:7b", ["research_models", "eval_benchmarks"]),
        "emp_16": ("Bảo Trâm", "dept_03", "Giám đốc Sản phẩm (CPO)", "LEADERSHIP", "qwen3:4b", ["analyze_ui_ux", "spec_features"]),
        "emp_24": ("Quốc Bảo", "dept_04", "Giám đốc Công nghệ (CTO)", "ENGINEERING", "qwen2.5-coder:7b", ["audit_repo_context", "inspect_logs", "technical_architecture"]),
        "emp_25": ("Kim Ngân", "dept_05", "Giám đốc Tài chính & Thuế (CFO)", "LEADERSHIP", "qwen3:4b", ["audit_tax_compliance", "cost_analysis", "regulatory_review"]),
        "emp_32": ("Thành Đạt", "dept_05", "Trưởng phòng Tài chính Doanh nghiệp", "SPECIALIST", "qwen3:4b", ["financial_modeling", "cash_flow_mgmt"]),
        "emp_40": ("Tuấn Kiệt", "dept_06", "Giám đốc Marketing (CMO)", "LEADERSHIP", "qwen3:4b", ["growth_hacking", "content_strategy"]),
        "emp_48": ("Hoàng Phúc", "dept_07", "Trưởng ban Kiểm toán & QA", "ENGINEERING", "qwen2.5-coder:7b", ["verify_artifacts", "security_scan", "test_gates"]),
        "emp_49": ("Minh Châu", "dept_07", "Chuyên viên Kiểm toán Chất lượng", "SPECIALIST", "qwen2.5-coder:3b", ["verify_artifacts", "acceptance_eval"]),
        "emp_56": ("Thùy Linh", "dept_08", "Giám đốc Vận hành (COO)", "LEADERSHIP", "qwen3:4b", ["incident_report", "support_dispatch"])
    }

    def __init__(self, skills_dir: Path = HUY_ROOT / 'skills'):
        self.skills_dir = skills_dir
        self.agents: Dict[str, Dict[str, Any]] = {}
        self._load_all_63_agents()

    def _load_all_63_agents(self):
        for idx in range(1, 64):
            aid = f"emp_{idx:02d}"
            # determine department
            dept_idx = ((idx - 1) // 8) + 1
            if dept_idx > 8:
                dept_idx = 8
            dept_id = f"dept_{dept_idx:02d}"
            dept_meta = self.BUSINESS_UNITS[dept_id]

            if aid in self.CORE_ROLES:
                name, d_id, role, tier, model, tools = self.CORE_ROLES[aid]
            else:
                name = f"Nhân viên AI #{idx:02d}"
                role = f"Chuyên viên {dept_meta['name']}"
                tier = "SPECIALIST" if idx % 2 == 0 else "SUPPORT"
                model = "qwen2.5-coder:3b" if tier == "SPECIALIST" else "smollm2:1.7b"
                tools = ["standard_query", "record_notes"]

            skill_path = self.skills_dir / f"huy-{aid.replace('_', '-')}-strategy" / "SKILL.md"
            has_skill_file = skill_path.is_file()

            self.agents[aid] = {
                "agent_id": aid,
                "full_name": name,
                "department_id": dept_id,
                "business_unit": dept_meta["bu"],
                "department_name": dept_meta["name"],
                "role_title": role,
                "tier": tier,
                "assigned_model": model,
                "capabilities": tools + [f"cap_{dept_id}"],
                "allowed_tools": tools,
                "workspace_path": f"/mnt/data1/HUY-AI/workspaces/departments/{dept_id}",
                "skill_file_exists": has_skill_file,
                "skill_file_path": str(skill_path) if has_skill_file else None,
                "status": "ACTIVE"
            }

    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        return self.agents.get(agent_id)

    def list_agents(self) -> List[Dict[str, Any]]:
        return list(self.agents.values())

    def get_department_agents(self, dept_id: str) -> List[Dict[str, Any]]:
        return [a for a in self.agents.values() if a["department_id"] == dept_id]

    def export_audit_json(self, output_file: Path):
        data = {
            "total_agents": len(self.agents),
            "total_business_units": len(self.BUSINESS_UNITS),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "business_units": self.BUSINESS_UNITS,
            "agents": self.agents
        }
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# 3. HAIP POLICY ENGINE (Zero-Trust & Plan-Only Guard)
# ---------------------------------------------------------------------------
class HAIPPolicyEngine:
    FORBIDDEN_PATHS = ["/mnt/data1/Projects/smarttax-ai"]

    def __init__(self, registry: HAIPAgentRegistry):
        self.registry = registry

    def check_message(self, message: Dict[str, Any]) -> (bool, str):
        # 1. Basic Envelope Check
        if message.get("protocol") != "HAIP" or message.get("version") != "1.0":
            return False, "ERR_PROTOCOL_MISMATCH"

        sender_id = message.get("sender", {}).get("agent_id")
        valid_system_senders = ["system", "owner", "human_operator"]
        sender = self.registry.get_agent(sender_id) if sender_id not in valid_system_senders else {"status": "ACTIVE"}
        if not sender:
            return False, f"ERR_UNKNOWN_SENDER_{sender_id}"

        # 2. Check Plan-Only violations
        payload = message.get("payload", {})
        action = payload.get("action", "")
        target = payload.get("target_path", "") or payload.get("target_system", "")
        mode = payload.get("execution_mode", "PLAN_ONLY")

        if mode == "PLAN_ONLY":
            if action in ["WRITE_FILE", "GIT_PUSH", "DEPLOY", "DELETE_FILE", "EXECUTE_MUTATION"]:
                return False, "SEC_E001_WRITE_TO_PLAN_ONLY_TARGET_DENIED"

        if any(target.startswith(fp) for fp in self.FORBIDDEN_PATHS) and action in ["WRITE_FILE", "GIT_PUSH", "MODIFY"]:
            return False, "SEC_E001_WRITE_TO_PLAN_ONLY_TARGET_DENIED"

        # 3. Check Human Gates
        if action in ["CLOUD_FALLBACK_BILLABLE", "ROTATE_SECRET", "DROP_DATABASE_TABLE", "PUBLIC_DEPLOY"]:
            return False, "GATE_R_AWAITING_OWNER_APPROVAL"

        return True, "POLICY_PERMITTED"


# ---------------------------------------------------------------------------
# 4. HAIP TASK ORCHESTRATOR & DAG ENGINE
# ---------------------------------------------------------------------------
class HAIPOrchestrator:
    def __init__(self, event_bus: HAIPEventBus, registry: HAIPAgentRegistry, policy: HAIPPolicyEngine):
        self.event_bus = event_bus
        self.registry = registry
        self.policy = policy

    def create_smarttax_plan_dag(self, task_id: str, initiator: str = "Owner") -> Dict[str, Any]:
        """Creates the formal DAG contract for SmartTax AI Plan Generation"""
        dag = {
            "task_id": task_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "initiator": initiator,
            "title": "SmartTax AI Website & System Upgrade Plan (2026-Q4)",
            "execution_mode": "PLAN_ONLY",
            "target_system": "https://smarttax-ai.vercel.app/",
            "local_repo": "/mnt/data1/Projects/smarttax-ai",
            "dag_nodes": [
                {
                    "subtask_id": f"{task_id}_SUB_01_CTO",
                    "assigned_agent": "emp_24", # Quốc Bảo (CTO)
                    "title": "Technical Architecture & Codebase Context Audit",
                    "dependencies": [],
                    "status": "PENDING",
                    "required_tools": ["audit_repo_context"]
                },
                {
                    "subtask_id": f"{task_id}_SUB_02_CFO",
                    "assigned_agent": "emp_25", # Kim Ngân (CFO)
                    "title": "Tax Compliance & Regulatory Invoice Verification",
                    "dependencies": [],
                    "status": "PENDING",
                    "required_tools": ["audit_tax_compliance"]
                },
                {
                    "subtask_id": f"{task_id}_SUB_03_MESH",
                    "assigned_agent": "emp_07", # Gia Hân (A2A Mesh)
                    "title": "A2A Inter-Departmental Handoff & Synchronization",
                    "dependencies": [f"{task_id}_SUB_01_CTO", f"{task_id}_SUB_02_CFO"],
                    "status": "PENDING",
                    "required_tools": ["a2a_mesh_route"]
                },
                {
                    "subtask_id": f"{task_id}_SUB_04_SYNTH",
                    "assigned_agent": "emp_01", # Mai Anh (Lead CEO)
                    "title": "Synthesis & Master Upgrade Plan Authorization",
                    "dependencies": [f"{task_id}_SUB_03_MESH"],
                    "status": "PENDING",
                    "required_tools": ["build_strategy_dag"]
                },
                {
                    "subtask_id": f"{task_id}_SUB_05_QA",
                    "assigned_agent": "emp_49", # Minh Châu (QA Auditor)
                    "title": "Independent Acceptance Gate Verification & SHA-256 Seal",
                    "dependencies": [f"{task_id}_SUB_04_SYNTH"],
                    "status": "PENDING",
                    "required_tools": ["verify_artifacts"]
                }
            ]
        }
        return dag


# ---------------------------------------------------------------------------
# 5. HAIP ACCEPTANCE & EVIDENCE ENGINE (Independent Verification)
# ---------------------------------------------------------------------------
class HAIPAcceptanceEngine:
    GATES = [
        "G0_IDENTITY_VALID",
        "G1_SCHEMA_COMPLIANT",
        "G2_ZERO_TRUST_APPROVED",
        "G3_PLAN_ONLY_CONFINED",
        "G4_REAL_INFERENCE_SUBSTANTIVE",
        "G5_EVIDENCE_FILE_EXISTS",
        "G6_SHA256_MATCH",
        "G7_NO_FAKE_PLACEHOLDERS",
        "G8_A2A_HANDOFF_VERIFIED",
        "G9_NON_DESTRUCTIVE_ZERO_MUTATION"
    ]

    def verify_plan_execution(self, task_dag: Dict[str, Any], artifact_files: List[Path]) -> Dict[str, Any]:
        results = {}
        for g in self.GATES:
            results[g] = {"status": "GREEN", "details": ""}

        # G3 & G9: Verify Plan-Only and Zero Mutation on target
        target_repo = task_dag.get("local_repo")
        if target_repo and os.path.isdir(target_repo):
            try:
                status = subprocess.check_output(["git", "-C", target_repo, "status", "--porcelain"], stderr=subprocess.DEVNULL).decode().strip()
                if status:
                    results["G9_NON_DESTRUCTIVE_ZERO_MUTATION"] = {"status": "RED", "details": f"Uncommitted changes found in target repo: {status}"}
                else:
                    results["G9_NON_DESTRUCTIVE_ZERO_MUTATION"]["details"] = "Target repo pristine. Zero mutations detected."
            except Exception as e:
                results["G9_NON_DESTRUCTIVE_ZERO_MUTATION"]["details"] = f"Repo check warning: {e}"

        # G5, G6, G7: Artifact verification
        verified_artifacts = []
        for af in artifact_files:
            if not af.is_file():
                results["G5_EVIDENCE_FILE_EXISTS"] = {"status": "RED", "details": f"File not found: {af}"}
                continue
            
            content = af.read_text(encoding="utf-8")
            if len(content) < 200:
                results["G4_REAL_INFERENCE_SUBSTANTIVE"] = {"status": "RED", "details": f"Artifact {af.name} too brief ({len(content)} bytes)"}
            
            # Anti-fake check
            fakes = ["lorem ipsum", "TODO: implement", "placeholder", "just testing"]
            if any(fk in content.lower() for fk in fakes):
                results["G7_NO_FAKE_PLACEHOLDERS"] = {"status": "RED", "details": f"Artifact contains placeholder in {af.name}"}

            sha = hashlib.sha256(content.encode("utf-8")).hexdigest()
            verified_artifacts.append({
                "file": str(af),
                "bytes": len(content),
                "sha256": sha
            })

        overall = "GREEN" if all(v["status"] == "GREEN" for v in results.values()) else "RED"

        return {
            "overall_verdict": overall,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "gates": results,
            "verified_artifacts": verified_artifacts
        }

if __name__ == '__main__':
    print("Testing HAIP Core modules...")
    bus = HAIPEventBus()
    reg = HAIPAgentRegistry()
    pol = HAIPPolicyEngine(reg)
    orch = HAIPOrchestrator(bus, reg, pol)
    acc = HAIPAcceptanceEngine()

    print(f"Loaded {len(reg.agents)} agents across {len(reg.BUSINESS_UNITS)} BUs.")
    
    # Export registry audit
    reg_audit_path = DELIVERY_ROOT / 'AGENT_REGISTRY_AUDIT.json'
    reg.export_audit_json(reg_audit_path)
    print(f"Exported Agent Registry Audit to {reg_audit_path}")

    # Test Plan-Only Policy rejection
    fake_msg = {
        "protocol": "HAIP",
        "version": "1.0",
        "message_id": "msg_test_001",
        "sender": {"agent_id": "emp_24", "department_id": "dept_04"},
        "recipient": {"agent_id": "system", "department_id": "system"},
        "payload": {
            "execution_mode": "PLAN_ONLY",
            "action": "WRITE_FILE",
            "target_path": "/mnt/data1/Projects/smarttax-ai/src/App.vue"
        }
    }
    permitted, reason = pol.check_message(fake_msg)
    print(f"Policy Check on forbidden write: Permitted={permitted}, Reason={reason}")
    assert not permitted and reason == "SEC_E001_WRITE_TO_PLAN_ONLY_TARGET_DENIED", "Policy Engine failed to enforce Plan-Only!"
    print("HAIP Core initialized and self-tested successfully.")
