"""Planning acceptance: declarations never authorize runtime execution."""
import unittest
import yaml
from test_workforce_schema import WorkforceSchema, ORG, json
from test_workforce_policy import WorkforcePolicy
class WorkforcePlanAcceptance(WorkforceSchema):
    def test_approved_contracts(self):
        load = lambda name: yaml.safe_load((ORG / (name + '.yaml')).read_text())
        for name, target in (('roles', 'role_cards'), ('permissions', 'permission_ceilings'), ('probation_tasks', 'probation_tasks'), ('hiring_order', 'hiring_order')):
            self.assertEqual(load(name), json.loads((ORG / (target + '.json')).read_text()))
        assignments = load('tool_assignments')
        self.assertEqual({k: v for k, v in assignments.items() if k != 'roles'}, {'schema_version': '1.0', 'owner': 'ai-hr-001'})
        self.assertEqual(assignments['roles'], {r['id']: {'tools': r['tools'], 'read_paths': r['read_paths'], 'write_paths': r['write_paths'], 'context': 'ISOLATED_OFFLINE_PENDING_AUTHORIZATION', 'enabled': False} for r in self.roles})
        for name in ('workforce_overview.md', 'workforce_plan.md'):
            self.assertTrue((ORG.parents[1] / 'docs/organization' / name).read_text().strip())
    def test_closed_roster_and_negative_cases(self):
        ids = [r['id'] for r in self.roles]
        roster = json.loads((ORG / 'workforce-roles.json').read_text())['priority_roles']
        self.assertCountEqual(ids, ['ai-hr-001'] + [r['id'] for r in roster])
        self.assertEqual(len(ids), len(set(ids)))
if __name__ == '__main__': unittest.main()
