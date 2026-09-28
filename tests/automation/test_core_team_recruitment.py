"""Pre-implementation contracts; declarations do not prove runtime isolation."""
import json
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[2]
ROLES = ('chief-architect', 'primary-coder', 'qa', 'security', 'devops', 'data')
def load(path):
    return json.loads((ROOT / path).read_text())
class CoreTeamRecruitment(unittest.TestCase):
    def test_roster_and_isolated_probation(self):
        roster = load('config/organization/core_team_roster.json')
        self.assertEqual(roster['schema_version'], '1.0')
        self.assertIs(roster['runtime_dispatch_enabled'], False)
        self.assertCountEqual([r['id'] for r in roster['roles']], ROLES)
        tasks, sandboxes = [], []
        for role in roster['roles']:
            with self.subTest(role=role['id']):
                self.assertEqual(role['status'], 'UNVERIFIED')
                self.assertEqual(role['permissions'], [])
                self.assertEqual(role['authority_source'], 'INHERIT_POLICY')
                self.assertIs(role['permission_override_allowed'], False)
                self.assertEqual(len(role['capabilities']), 3)
                self.assertEqual(len(role['capabilities']), len(set(role['capabilities'])))
                if role['id'] == 'primary-coder': self.assertEqual(role['provider'], 'antigravity')
                self.assertEqual(len(role['probation_tasks']), 3)
                for task in role['probation_tasks']:
                    self.assertEqual(task['role_id'], role['id'])
                    self.assertIs(task['isolated'], True)
                    self.assertEqual(task['execution_mode'], 'OFFLINE_SYNTHETIC')
                    self.assertTrue(all(isinstance(task[k], str) and task[k].strip() for k in ('id', 'sandbox_id', 'input', 'expected')))
                    tasks.append(task['id']); sandboxes.append(task['sandbox_id'])
        self.assertEqual(len(tasks), len(set(tasks)))
        self.assertEqual(len(sandboxes), len(set(sandboxes)))
    def test_fail_closed_boundaries_and_rollback(self):
        p = load('config/autonomy/probation_policy.json')
        self.assertEqual(p['default_decision'], 'DENY')
        self.assertEqual(p['sandbox'], dict(mode='PURE_SYNTHETIC', filesystem='DENY', network='DENY', process_execution='DENY', secret_access='DENY', database='DENY', promotion='INDEPENDENT_RUNTIME_REVIEW_AND_HUMAN_APPROVAL'))
        self.assertCountEqual(p['paths']['forbidden'], ['.env', '.artifacts/', '.agent-worktrees/', 'secrets/', 'supabase/migrations/', 'supabase/rollback/'])
        for flag in ('deny_overrides_allow', 'resolve_symlinks', 'deny_outside_workspace', 'deny_nested_forbidden', 'deny_env_variants', 'reject_parent_traversal', 'reject_absolute_paths', 'component_boundary_matching'):
            self.assertIs(p['paths'][flag], True, flag)
        for case in ('unknown_role', 'unknown_capability', 'missing_evidence', 'failed_tests', 'self_approval', 'malformed_request', 'missing_policy', 'invalid_policy', 'stale_evidence', 'scope_mismatch', 'unverified_runtime', 'empty_path', 'nul_path', 'encoded_traversal', 'backslash_traversal', 'secret_exposure', 'production_mutation', 'cross_role_task', 'replayed_receipt'):
            self.assertEqual(p['gates'][case], 'DENY', case)
        self.assertEqual(p['rollback'], {'on_invalid_policy': 'DENY_ALL', 'preserve_revocations': True, 'revalidate_evidence': True, 'allow_privilege_expansion': False})
