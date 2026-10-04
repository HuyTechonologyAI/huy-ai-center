import test from 'node:test';
import assert from 'node:assert/strict';
import { probeCli } from '../../automation/agent-bridge/src/cli-probe.js';
test('CLI probe preserves shell metacharacters as literal arguments',()=>{
 const literal='$(echo injected); & | > %PATH% "quoted"';
 const result=probeCli(process.execPath,['-e','process.stdout.write(process.argv[1])',literal]);
 assert.equal(result.installed,true);assert.equal(result.version,literal);
});
test('CLI probe fails closed for missing executable and nonzero exit',()=>{
 assert.equal(probeCli('/nonexistent/recovery-command',[]).installed,false);
 assert.equal(probeCli(process.execPath,['-e','process.exit(2)']).installed,false);
});
