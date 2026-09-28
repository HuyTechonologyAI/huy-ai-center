import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { scan, review, persist, CATEGORIES } from './github-radar.ts';
const now = new Date('2026-09-28T00:00:00Z');
const repo = { id: 1, full_name: 'org/agent', private: false, archived: false, disabled: false, license: { spdx_id: 'MIT' }, pushed_at: '2026-09-27T00:00:00Z', stargazers_count: 1200, description: 'multi-agent MCP coding agent observability local model routing education RAG', topics: ['mcp'], default_branch: 'main' };
test('deterministic review and hard eligibility gates', () => {
 const good = review(repo, ['mcp'], now, '2026-09-20T00:00:00Z');
 assert.equal(good.state, 'PROBATION_PENDING');
 assert.deepEqual(good, review(repo, ['mcp'], now, '2026-09-20T00:00:00Z'));
 for (const patch of [{license:null}, {license:{spdx_id:'NOASSERTION'}}, {license:{spdx_id:'GPL-3.0'}}, {archived:true}, {pushed_at:'2020-01-01'}, {pushed_at:'invalid'}, {private:true}]) {
  assert.equal(review({...repo,...patch}, [], now, null).state, 'REVIEWED');
 }
 assert.deepEqual(good.lifecycle, ['SCOUTED','REVIEWED','PROBATION_PENDING']);
 assert.equal(good.runtime_active, false);
});
test('public GET searches, dedupe, release metadata, optional token', async () => {
 for (const token of [undefined, 'test-token']) {
 const calls: string[] = [];
 const result = await scan({now, token, fetcher: async (url, init) => {
  calls.push(String(url)); assert.equal(init?.method,'GET'); assert.equal(init?.redirect,'error');
  assert.equal(new Headers(init?.headers).get('Authorization'), token ? `Bearer ${token}` : null);
  return Response.json(String(url).includes('/search/') ? {items:[repo], incomplete_results:false} : [{published_at:'2026-09-20T00:00:00Z',draft:false,prerelease:false}]);
 }});
 assert.equal(calls.length, CATEGORIES.length + 1);
 assert.equal(result.candidates.length,1); assert.equal(result.probation_pending.length,1);
 assert.equal(result.human_gate_candidates[0].risk_level,3);
 assert.equal(result.candidates[0].categories.length,CATEGORIES.length);
 }
});
test('rate limits and malformed responses fail closed without leaking response bodies', async () => {
 for (const response of [new Response('secret',{status:429}), Response.json({items:'bad'}), Response.json({items:[{...repo,full_name:'../../escape'}]})]) {
 const result = await scan({now,fetcher:async()=>response.clone()});
 assert.equal(result.probation_pending.length,0); assert.equal(result.status,'partial');
 assert.ok(!JSON.stringify(result).includes('secret'));
 }
});
test('release errors do not promote candidates; incomplete searches are visible', async () => {
 const result = await scan({now,fetcher:async url=>String(url).includes('/search/') ? Response.json({items:[repo],incomplete_results:true}) : new Response('',{status:503})});
 assert.equal(result.status,'partial'); assert.equal(result.probation_pending.length,0);
});
test('persist latest/history/report and idempotent gated manifests', async () => {
 const root = await mkdtemp(join(process.cwd(),'automation/ai-hr/.test-'));
 try {
 const result = await scan({now,fetcher:async url=>Response.json(String(url).includes('/search/') ? {items:[repo],incomplete_results:false}:[])});
 await persist(result,root); await persist(result,root);
 assert.equal((await readdir(join(root,'probation-queue'))).length,1);
 const manifest = JSON.parse(await readFile(join(root,'probation-queue','github-1.json'),'utf8'));
 assert.equal(manifest.runtime_active,false); assert.equal(manifest.integration_gate.risk_level,3);
 assert.equal(manifest.integration_gate.status,'AWAITING_APPROVAL');
 assert.match(await readFile(join(root,'github-radar','latest.md'),'utf8'),/PROBATION_PENDING/);
 assert.equal((await readdir(join(root,'github-radar','history'))).length,2);
 } finally {await rm(root,{recursive:true,force:true});}
});
test('score reflects release, activity, stars and relevance', () => {
 const base=review(repo,[],now,null);
 assert.ok(review(repo,[],now,'2026-09-20').score>base.score);
 assert.ok(review({...repo,stargazers_count:0},[],now,null).score<base.score);
 assert.ok(review({...repo,pushed_at:'2026-07-01'},[],now,null).score<base.score);
 assert.ok(review({...repo,description:null,topics:[]},[],now,null).score<base.score);
});
test('token stays out of persisted results and rate limiting stops requests', async () => {
 let calls=0;
 const result=await scan({now,token:'private-secret',fetcher:async()=>{calls++;return new Response('private-secret',{status:403});}});
 assert.equal(calls,1); assert.equal(result.status,'partial');
 assert.ok(!JSON.stringify(result).includes('private-secret'));
});
