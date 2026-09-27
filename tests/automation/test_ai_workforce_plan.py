"""Frozen planning contracts; validation does not certify runtime isolation."""
import unittest, jsonschema
import test_workforce_plan as existing
from test_workforce_schema import ORG, json
class AIWorkforcePlan(existing.WorkforcePlanAcceptance, existing.WorkforcePolicy):
    def test_approved_schema_and_qualification(self):
        load = lambda name: json.loads((ORG / (name + '.json')).read_text())
        schema, plan = load('workforce_schema'), load('roles')
        jsonschema.Draft202012Validator.check_schema(schema)
        validator = jsonschema.Draft202012Validator(schema)
        validator.validate(plan)
        self.assertEqual(plan['roles'], self.roles)
        for cards in ([], self.roles + [self.roles[0]], [None], [self.roles[0]] * len(self.roles)):
            self.assertFalse(validator.is_valid({**plan, 'roles': cards}))
        for name in ('tool_assignments', 'permission_ceilings', 'probation_tasks'):
            check = jsonschema.Draft202012Validator(schema['$defs'][name])
            check.validate(load(name)); self.assertFalse(check.is_valid({**load(name), 'unauthorized': True}))
        self.assertEqual(load('tool_assignments'), existing.yaml.safe_load((ORG / 'tool_assignments.yaml').read_text()))
        for role in self.roles:
            self.assertTrue(all(t['risk_level'] <= int(role['authority']['max_auto_risk'][1:]) for t in json.loads((ORG.parent / 'architecture/v2/tool_permissions.json').read_text())['permissions'] if t['id'] in role['tools']))
            q = plan['qualification'][role['id']]
            self.assertEqual(q['scores'], dict.fromkeys(role['competencies'], 0))
            self.assertFalse(validator.is_valid({**plan, 'qualification': {**plan['qualification'], role['id']: {**q, 'required_score': 0}}}))
            self.assertIn(role['id'], (ORG.parents[1] / 'docs/organization/role_cards.md').read_text())
            if role['stage'] == 'IMPLEMENTER':
                self.assertTrue(all(load('hiring_order')['hiring_order'].index(d) < load('hiring_order')['hiring_order'].index(role['id']) for d in ('ai-hr-001', 'chief-architect', 'qa', 'security')))
if __name__ == '__main__': unittest.main()
