"""Closed planning contracts; requires PyYAML and jsonschema; run with python3 -B."""
from pathlib import Path
import json, unittest, jsonschema, yaml
ORG = Path(__file__).resolve().parents[2] / 'config/organization'
def artifact(name, fields):
    data = json.loads((ORG / name).read_text())
    if not isinstance(data, dict) or set(data) != {'schema_version', 'owner', *fields} or data['schema_version'] != '1.0' or data['owner'] != 'ai-hr-001':
        raise ValueError(f'Invalid contract: {name}')
    return data
class WorkforceSchema(unittest.TestCase):
    def setUp(self):
        self.plan = yaml.safe_load((ORG / 'ai_workforce.yaml').read_text())
        self.roles = artifact('role_cards.json', ['roles'])['roles']
        schema = json.loads((ORG / 'roles_schema.json').read_text())
        jsonschema.Draft202012Validator.check_schema(schema)
        self.validator = jsonschema.Draft202012Validator(schema)
    def test_valid_cards_and_canonical_tools(self):
        self.assertEqual(self.roles, self.plan['roles'])
        tools = json.loads((ORG.parent / 'architecture/v2/tool_permissions.json').read_text())['permissions']
        mesh = json.loads((ORG.parent / 'autonomy/provider-mesh.json').read_text())['roles']
        for role in self.roles:
            self.validator.validate(role)
            self.assertLessEqual(set(role['tools']), {t['id'] for t in tools if not t['sensitive']})
            self.assertIn(role['provider'], mesh[role['stage']])
    def test_reject_missing_unknown_escalated_and_malformed_fields(self):
        for role in self.roles:
            bad = [None, [], {}, {**role, 'unexpected': True}] + [{k: v for k, v in role.items() if k != field} for field in role]
            for field, value in [('title', ' '), ('priority', 1.5), ('depends_on', ['unknown']), ('depends_on', None), ('tier', 'T5'), ('competencies', [' ']), ('competencies', ['a', 'a']), ('probation_tasks', ['a', 'a', 'a']), ('priority', True), ('priority', 0), ('tools', ['tool.email.send']), ('tools', '*'), ('provider', 'unknown'), ('permissions', ['admin']), ('status', 'ACTIVE'), ('secrets', {'token': 'dummy'}), ('probation_tasks', ['one']), ('competencies', []), ('depends_on', [role['id']])]:
                bad.append({**role, field: value})
            for card in bad:
                self.assertFalse(self.validator.is_valid(card), card)
if __name__ == '__main__': unittest.main()
