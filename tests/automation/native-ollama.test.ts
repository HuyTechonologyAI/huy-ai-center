import test from 'node:test';
import assert from 'node:assert/strict';
import { runProviderPrompt } from '../../automation/agent-bridge/src/provider-mesh.js';

test('native Ollama validates bounded prompt, malformed output and HTTP failures', async () => {
 const original = globalThis.fetch;
 let calls = 0;
 globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({response:'local result',done:true})); };
 const req = {provider:'ollama' as const,prompt:'hello',cwd:'/tmp',mode:'READ_ONLY' as const,timeoutMs:100};
 try {
  assert.equal((await runProviderPrompt(req)).output, 'local result');
  const oversized = await runProviderPrompt({...req,prompt:'x'.repeat(65537)});
  assert.equal(oversized.success,false);
  assert.match(oversized.error,/PROMPT_TOO_LARGE/);
  assert.equal(calls,1);
  globalThis.fetch = async () => new Response('{}');
  assert.equal((await runProviderPrompt(req)).success,false);
  globalThis.fetch = async () => new Response('unavailable',{status:503});
  const failure=await runProviderPrompt(req);
  assert.equal(failure.success,false); assert.equal(failure.retryable,true);
 } finally { globalThis.fetch=original; }
});

test('Ollama rejects unscoped writes and classifies timeout without Codex', async () => {
 const original = globalThis.fetch;
 const req = {provider:'ollama' as const,prompt:'hello',cwd:'/tmp',mode:'READ_ONLY' as const,timeoutMs:10};
 try {
  globalThis.fetch = async () => { throw new Error('must not fetch'); };
  assert.match((await runProviderPrompt({...req,mode:'WORKSPACE_WRITE'})).error,/EDIT_SCOPE_REQUIRED/);
  globalThis.fetch = async (_url, init) => new Promise((_resolve,reject) => {
    init?.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});
  });
  const result=await runProviderPrompt(req);
  assert.equal(result.success,false); assert.match(result.error,/PROVIDER_TIMEOUT/);
 } finally { globalThis.fetch=original; }
});
