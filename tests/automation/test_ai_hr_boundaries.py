"""Pre-implementation policy contract; does not prove runtime enforcement."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
ALLOWED = ["config/organization/", "docs/organization/", "tests/automation/", "PROJECT_STATE.md"]
FORBIDDEN = [".env", "secrets/", "supabase/migrations/", "supabase/rollback/", ".artifacts/", ".agent-worktrees/"]

class HRBoundaries(unittest.TestCase):
    def setUp(self):
        path = ROOT / "config/organization/workforce_control_policy.json"
        self.assertTrue(path.is_file(), "Missing workforce-control policy")
        self.policy = json.loads(path.read_text())
        self.assertIsInstance(self.policy, dict)

    def test_authority_and_schema(self):
        p = self.policy
        self.assertEqual(p["schema_version"], "1.0")
        self.assertEqual(p["owner"], "ai-hr-001")
        self.assertEqual(p["default_decision"], "DENY")
        for key, value in {"max_auto_risk": "R2", "production_mutation": "DENY",
                           "secret_access": "DENY", "merge_to_main": "HUMAN_REQUIRED",
                           "r3_r4": "HUMAN_GATE"}.items():
            self.assertEqual(p["authority"][key], value, key)
        self.assertIs(p["authority"]["self_grant_permissions"], False)
        self.assertIs(p["authority"]["delegate_privilege_escalation"], False)

    def test_path_isolation_contract(self):
        paths = self.policy["paths"]
        self.assertCountEqual(paths["allowed"], ALLOWED)
        self.assertCountEqual(paths["forbidden"], FORBIDDEN)
        for key in ("deny_overrides_allow", "component_boundary_matching",
                    "resolve_symlinks", "deny_outside_workspace", "deny_nested_forbidden",
                    "deny_env_variants", "reject_parent_traversal", "reject_absolute_paths"):
            self.assertIs(paths[key], True, key)

    def test_missing_malformed_and_stale_inputs_deny(self):
        gates = self.policy["gates"]
        for case in ("unknown_role", "unknown_capability", "missing_evidence", "failed_tests",
                     "missing_approval", "expired_approval", "revoked_approval", "self_approval",
                     "malformed_request", "invalid_policy", "missing_policy", "unknown_risk",
                     "empty_path", "nul_path", "encoded_traversal", "backslash_traversal",
                     "stale_evidence", "scope_mismatch", "unverified_runtime"):
            with self.subTest(case=case):
                self.assertEqual(gates[case], "DENY")

    def test_all_roles_require_verified_capabilities(self):
        roles = self.policy["roles"]
        roster = json.loads((ROOT / "config/organization/workforce-roles.json").read_text())
        self.assertCountEqual([r["id"] for r in roles],
                              ["ai-hr-001"] + [r["id"] for r in roster["priority_roles"]])
        for role in roles:
            with self.subTest(role=role["id"]):
                self.assertEqual(role["authority_source"], "INHERIT_POLICY")
                self.assertIs(role["permission_override_allowed"], False)
        required = self.policy["capability_schema"]["required"]
        for field in ("role_id", "capability", "evidence", "verified_at", "expires_at", "reviewer"):
            self.assertIn(field, required)
        self.assertIs(self.policy["capability_schema"]["additional_properties"], False)
        for key in ("test_before_onboarding", "independent_review_required",
                    "least_privilege_required", "isolated_worktree_required_for_coding_agents"):
            self.assertIs(self.policy["recruitment_policy"][key], True, key)

    def test_activation_requires_runtime_and_independent_evidence(self):
        self.assertEqual(self.policy["status"], "CONTRACT_ACTIVE_RUNTIME_DISABLED")
        self.assertIs(self.policy["runtime_dispatch_enabled"], False)
        self.assertEqual(self.policy["allocation"], {"max_concurrency": 1, "probation_tasks": 3,
                                                   "required_pass_rate": 1.0, "max_evidence_age_days": 30})
        schema = self.policy["capability_schema"]
        self.assertEqual(set(schema["properties"]), set(schema["required"]))
        for field in schema["required"]:
            self.assertEqual(schema["properties"][field]["type"], "string")
            self.assertEqual(schema["properties"][field]["minLength"], 1)
        for role in self.policy["roles"]:
            self.assertEqual(role["status"], "UNVERIFIED")
            self.assertEqual(role["permissions"], [])

    def test_rollback_cannot_restore_revoked_authority(self):
        rollback = self.policy["rollback"]
        self.assertEqual(rollback["on_invalid_policy"], "DENY_ALL")
        self.assertIs(rollback["preserve_revocations"], True)
        self.assertIs(rollback["revalidate_evidence"], True)
        self.assertIs(rollback["allow_privilege_expansion"], False)

if __name__ == "__main__":
    unittest.main()
