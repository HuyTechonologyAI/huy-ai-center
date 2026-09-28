"""Validate synthetic receipts against the policy-owned JSON Schema, offline."""
import copy, hashlib, json, unittest
from unittest.mock import patch
import jsonschema
from test_core_team_recruitment import ROOT, ROLES, load
def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
def verify(receipt, output, role, task, validator, seen):
    try:
        policy = load('config/autonomy/probation_policy.json')
        if policy['default_decision'] != 'DENY' or validator.schema != policy['receipt_schema']: return False
        if set(policy['gates']) != set('unknown_role unknown_capability missing_evidence failed_tests self_approval malformed_request missing_policy invalid_policy stale_evidence scope_mismatch unverified_runtime empty_path nul_path encoded_traversal backslash_traversal secret_exposure production_mutation cross_role_task replayed_receipt'.split()) or any(v != 'DENY' for v in policy['gates'].values()) or any(v is not True for k, v in policy['paths'].items() if k != 'forbidden'): return False
        if policy['rollback'] != dict(on_invalid_policy='DENY_ALL', preserve_revocations=True, revalidate_evidence=True, allow_privilege_expansion=False) or policy['sandbox']['mode'] != 'PURE_SYNTHETIC' or policy['sandbox']['promotion'] != 'INDEPENDENT_RUNTIME_REVIEW_AND_HUMAN_APPROVAL' or any(policy['sandbox'][k] != 'DENY' for k in ('filesystem', 'network', 'process_execution', 'secret_access', 'database')): return False
        if set(policy['paths']) != set('forbidden deny_overrides_allow resolve_symlinks deny_outside_workspace deny_nested_forbidden deny_env_variants reject_parent_traversal reject_absolute_paths component_boundary_matching'.split()) or policy['paths']['forbidden'] != ['.env', '.artifacts/', '.agent-worktrees/', 'secrets/', 'supabase/migrations/', 'supabase/rollback/']: return False
        if not validator.is_valid(receipt): return False
        roster = load('config/organization/core_team_roster.json')
        if roster['runtime_dispatch_enabled'] is not False or role not in roster['roles']: return False
    except (OSError, ValueError, KeyError, TypeError, AttributeError): return False
    if not isinstance(role, dict) or not isinstance(task, dict): return False
    if role.get('authority_source') != 'INHERIT_POLICY' or role.get('permission_override_allowed') is not False: return False
    if task not in role['probation_tasks'] or task.get('isolated') is not True or task.get('execution_mode') != 'OFFLINE_SYNTHETIC': return False
    if not isinstance(output, dict) or output != {'task_id': task['id'], 'tokens': sorted(task['input'].split())}: return False
    index = role['probation_tasks'].index(task)
    return (receipt['role_id'] == role['id'] and receipt['task_id'] == task['id']
            and receipt['sandbox_id'] == task['sandbox_id'] and receipt['capability'] == role['capabilities'][index]
            and receipt['evidence_sha256'] == digest(output) and receipt['task_id'] not in seen
            and task['role_id'] == role['id'] and role['status'] == 'UNVERIFIED' and role['permissions'] == [])
class CapabilityReceipts(unittest.TestCase):
    def test_receipt_schema_positive_and_adversarial_cases(self):
        schema = load('config/autonomy/probation_policy.json')['receipt_schema']
        jsonschema.Draft202012Validator.check_schema(schema)
        validator = jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
        roster = load('config/organization/core_team_roster.json')['roles']
        self.assertCountEqual([r['id'] for r in roster], ROLES)
        seen = set()
        for role, task in ((r, t) for r in roster for t in r['probation_tasks']):
            # Pure synthetic execution uses fresh memory, no tools, files, credentials or network.
            output = {'task_id': task['id'], 'tokens': sorted(task['input'].split())}
            good = dict(role_id=role['id'], capability=role['capabilities'][role['probation_tasks'].index(task)], task_id=task['id'],
                        sandbox_id=task['sandbox_id'], reviewer='independent-qa',
                        evidence_sha256=digest(output), verdict='PASS', isolated=True, secret_exposure=False,
                        production_mutations=0, safety_gates_passed=True, fixture_only=True)
            with self.subTest(role=role['id']):
                for failure in (OSError('missing policy'), ValueError('invalid policy')):
                    with patch(__name__ + '.load', side_effect=failure): self.assertFalse(verify(good, output, role, task, validator, seen))
                for section, key in [('gates', 'secret_exposure'), ('sandbox', 'network'), ('sandbox', 'mode'), ('sandbox', 'promotion'), ('rollback', 'on_invalid_policy'), ('rollback', 'allow_privilege_expansion'), ('paths', 'deny_overrides_allow'), ('paths', 'reject_parent_traversal'), ('paths', 'forbidden')]:
                    altered_policy = load('config/autonomy/probation_policy.json'); altered_policy[section][key] = 'ALLOW'
                    with patch(__name__ + '.load', return_value=altered_policy): self.assertFalse(verify(good, output, role, task, validator, seen))
                for section, key in [('gates', 'secret_exposure'), ('paths', 'reject_parent_traversal')]:
                    altered_policy = load('config/autonomy/probation_policy.json'); altered_policy[section]['unknown'] = altered_policy[section].pop(key)
                    with patch(__name__ + '.load', return_value=altered_policy): self.assertFalse(verify(good, output, role, task, validator, seen))
                self.assertFalse(verify(good, output, role, task, jsonschema.Draft202012Validator({}), seen))
                self.assertIn(task['id'] + '=' + digest(output), (ROOT / 'PROJECT_STATE.md').read_text())
                self.assertTrue(verify(good, output, role, task, validator, seen))
                for malformed in (None, [], {}, {**role, 'capabilities': ['admin']}): self.assertFalse(verify(good, output, malformed, task, validator, seen))
                for malformed in (None, [], {}): self.assertFalse(verify(good, output, role, malformed, validator, seen))
                for field, value in [('authority_source', 'SELF'), ('permission_override_allowed', True), ('permissions', ['admin']), ('status', 'ACTIVE')]:
                    self.assertFalse(verify(good, output, {**role, field: value}, task, validator, seen))
                for malformed in (None, [], {}, {'unserializable': object()}): self.assertFalse(verify(good, malformed, role, task, validator, seen))
                self.assertFalse(verify(good, output, role, {**task, 'role_id': 'unknown'}, validator, seen))
                leaked = {**output, 'tokens': ['synthetic-secret']}
                self.assertFalse(verify({**good, 'evidence_sha256': digest(leaked)}, leaked, role, task, validator, seen))
                for field, value in [('evidence_sha256', '0' * 64), ('sandbox_id', role['probation_tasks'][-1 if task == role['probation_tasks'][0] else 0]['sandbox_id'])]:
                    self.assertFalse(verify({**good, field: value}, output, role, task, validator, seen))
                self.assertFalse(verify({**good, 'capability': role['capabilities'][(role['probation_tasks'].index(task) + 1) % 3]}, output, role, task, validator, seen))
                bad = [None, [], {}, {**good, 'unexpected': 'synthetic-secret'}]
                bad += [{k: v for k, v in good.items() if k != field} for field in good]
                changes = [('role_id', 'unknown'), ('capability', 'admin'), ('task_id', 'unknown'), ('sandbox_id', '../outside'), ('reviewer', ''), ('reviewer', role['id']), ('evidence_sha256', 'xyz'), ('verdict', 'FAIL'), ('isolated', False), ('secret_exposure', True), ('production_mutations', 1), ('production_mutations', -1), ('production_mutations', False), ('safety_gates_passed', False), ('fixture_only', False)]
                changes += [(k, None) for k in good] + [(k, ' ') for k in ('role_id', 'capability', 'task_id', 'reviewer')]
                changes += [('role_id', other) for other in ROLES if other != role['id']]
                bad += [{**good, key: value} for key, value in changes]
                snapshot = copy.deepcopy((bad, good, output, role, task, seen)); self.assertTrue(verify(good, output, role, task, validator, seen))
                for receipt in bad:
                    with self.subTest(receipt=receipt): self.assertFalse(verify(receipt, output, role, task, validator, seen))
                self.assertEqual((bad, good, output, role, task, seen), snapshot, 'Validation must not mutate evidence')
                for field, value in [('isolated', False), ('execution_mode', 'LIVE')]:
                    altered = {**task, field: value}
                    self.assertFalse(verify(good, output, {**role, 'probation_tasks': [altered]}, altered, validator, seen))
                seen.add(task['id'])
                self.assertFalse(verify(good, output, role, task, validator, seen))
        self.assertEqual(len(seen), 18)
