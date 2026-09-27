"""Declaration enforcement only; actual sandbox qualification is a separate gate."""
import unittest
import test_ai_hr_boundaries as boundaries
from test_workforce_schema import WorkforceSchema, artifact, ORG, json
class WorkforcePolicy(boundaries.HRBoundaries, WorkforceSchema):
    def setUp(self):
        WorkforceSchema.setUp(self)
        self.policy = json.loads((ORG / 'permission_ceilings.json').read_text())
        self.assertEqual(self.policy, json.loads((ORG / 'workforce_control_policy.json').read_text()))
    def test_order_probation_and_documented_coverage(self):
        order = artifact('hiring_order.json', ['hiring_order'])['hiring_order']
        suite = artifact('probation_tasks.json', ['tasks', 'allocation', 'isolated', 'independent_review_required', 'benchmarks'])
        self.assertCountEqual(order, [r['id'] for r in self.policy['roles']])
        self.assertEqual(order, self.plan['hiring_order'])
        self.assertEqual(order, [r['id'] for r in sorted(self.roles, key=lambda r: (r['priority'], r['id']))])
        self.assertEqual(suite['tasks'], {r['id']: r['probation_tasks'] for r in self.roles})
        self.assertEqual((suite['allocation'], self.plan['allocation'], self.plan['rollback']), (self.policy['allocation'], self.policy['allocation'], self.policy['rollback']))
        self.assertIs(suite['isolated'], True)
        self.assertIs(suite['independent_review_required'], True)
        self.assertIs(self.plan['runtime_dispatch_enabled'], False)
        self.assertEqual(set(suite['benchmarks']), set(order))
        for role in self.roles:
            benchmarks = suite['benchmarks'][role['id']]
            self.assertEqual([b['task'] for b in benchmarks], role['probation_tasks'])
            for b in benchmarks:
                self.assertEqual(set(b), {'task', 'input', 'expected'})
                self.assertTrue(all(isinstance(v, str) and v.strip() for v in b.values()))
            for dependency in role['depends_on']:
                self.assertLess(order.index(dependency), order.index(role['id']))
            for name in ('competency_matrix.md', 'probation_tasks.md', 'hiring_order.md'):
                self.assertIn(role['id'], (ORG.parents[1] / 'docs/organization' / name).read_text())
    def test_path_and_authority_escalations_rejected(self):
        for role in self.roles:
            self.assertEqual(role['authority'], self.policy['authority'])
            self.assertEqual(role['paths'], self.policy['paths'])
            for key in ('read_paths', 'write_paths'):
                for path in self.policy['paths']['forbidden'] + ['/tmp/', '../', 'docs/organization/.env.local', 'docs/organization/secrets/', 'docs/organization/../', 'docs/organization-evil/', 'docs%2f..', 'docs\\..', '', '\x00']:
                    self.assertFalse(self.validator.is_valid({**role, key: [path]}))
            self.assertFalse(self.validator.is_valid({**role, 'authority': {**role['authority'], 'self_grant_permissions': True}}))
if __name__ == '__main__': unittest.main()
