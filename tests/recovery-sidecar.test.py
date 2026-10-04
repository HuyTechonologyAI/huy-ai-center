import importlib.util,unittest,tempfile,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('sidecar','deploy/node01/legacy-supervisor-sidecar.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class SidecarTests(unittest.TestCase):
 def test_single_owner_and_no_legacy_state_merge(self):
  result=module.project({'state':'WAITING_HUMAN','taskId':'08b','humanGate':True,'reason':'private','providers':{'key':'omit'}})
  self.assertEqual(result['canonicalOwner'],'Persistent Multi-AI Supervisor')
  self.assertEqual(result['currentTaskId'],'08b');self.assertEqual(result['gate'],'HUMAN_GATE')
  self.assertNotIn('providers',result);self.assertNotIn('reason',result)
 def test_missing_state_fails_closed(self):
  result=module.project({});self.assertEqual(result['state'],'UNKNOWN');self.assertFalse(result['ownsRoadmap'])
unittest.main()
