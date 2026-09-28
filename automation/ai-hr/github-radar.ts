import { mkdir, writeFile, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

export const CATEGORIES = [
 ['multi-agent-orchestration', 'multi-agent orchestration'],
 ['mcp', 'MCP server tools'],
 ['coding-agents', 'coding agent'],
 ['ai-observability', 'AI observability'],
 ['local-model-routing', 'local LLM routing'],
 ['education-rag', 'education RAG'],
] as const;
export const LICENSES = new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','0BSD','Unlicense','CC0-1.0','Zlib']);
export const THRESHOLD = 65;
interface Repository {
 id: number; full_name: string; private: boolean; archived: boolean; disabled: boolean;
 license: {spdx_id: string} | null; pushed_at: string; stargazers_count: number;
 description: string | null; topics: string[]; default_branch: string;
}
const age = (date: string | null, now: Date) => date ? (now.getTime() - Date.parse(date))/86400000 : NaN;
const recent = (date: string | null, now: Date, days: number) => age(date,now) >= 0 && age(date,now) <= days;
export function review(repo: Repository, categories: string[], now: Date, release: string | null, metadataComplete = true) {
 const license = repo.license?.spdx_id ?? 'UNKNOWN';
 const text = `${repo.description ?? ''} ${repo.topics.join(' ')}`.toLowerCase();
 const relevance = [/multi.?agent|orchestrat/, /\bmcp\b|model context protocol/, /coding|code.agent/, /observability|tracing|eval/, /local|ollama|routing/, /education|\brag\b/].filter(re=>re.test(text)).length;
 const reasons = [!LICENSES.has(license) && 'license_not_allowlisted', repo.archived && 'archived', repo.disabled && 'disabled', repo.private && 'not_public', !recent(repo.pushed_at,now,180) && 'stale_or_invalid_push', !metadataComplete && 'metadata_incomplete', !relevance && 'no_relevance'].filter((x): x is string=>Boolean(x));
 const score = (LICENSES.has(license)?20:0) + (!repo.archived && !repo.disabled?10:0) + (recent(repo.pushed_at,now,30)?20:recent(repo.pushed_at,now,180)?10:0) + Math.min(20,Math.floor(Math.log10(Math.max(0,repo.stargazers_count)+1)*5)) + Math.min(20,relevance*4) + (recent(release,now,180)?10:0);
 const pending = reasons.length === 0 && score >= THRESHOLD;
 return {id:repo.id, repository:repo.full_name, url:`https://github.com/${repo.full_name}`, categories:[...categories].sort(), license, score, reasons, pushed_at:repo.pushed_at, release_published_at:release, stars:repo.stargazers_count,
 state:pending?'PROBATION_PENDING':'REVIEWED', lifecycle:pending?['SCOUTED','REVIEWED','PROBATION_PENDING']:['SCOUTED','REVIEWED'], review_type:'automated_metadata', runtime_active:false as const};
}
function validRepo(value: unknown): value is Repository {
 if (!value || typeof value !== 'object') return false;
 const r = value as Repository;
 return Number.isSafeInteger(r.id) && r.id>0 && typeof r.full_name==='string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r.full_name) && !r.full_name.split('/').some(s=>s==='.'||s==='..') && r.private===false && typeof r.archived==='boolean' && typeof r.disabled==='boolean' && typeof r.pushed_at==='string' && Number.isFinite(r.stargazers_count) && r.stargazers_count>=0 && (r.description===null||typeof r.description==='string') && Array.isArray(r.topics) && r.topics.every(t=>typeof t==='string') && (r.license===null || typeof r.license?.spdx_id==='string');
}
export async function scan(options: {now?:Date; token?:string; fetcher?:typeof fetch} = {}) {
 const now = options.now ?? new Date();
 const fetcher = options.fetcher ?? fetch;
 const errors: string[] = [];
 let halted = false;
 async function get(path: string): Promise<unknown> {
  if (halted) throw new Error('rate_limit_stop');
  const headers: Record<string,string> = {Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'HUY-AI-GitHub-Radar'};
  if (options.token) headers.Authorization=`Bearer ${options.token}`;
  let response: Response;
  try {response=await fetcher(`https://api.github.com${path}`,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(15000)});} catch {throw new Error('network_or_timeout');}
  if (response.status===403 || response.status===429) halted=true;
  if (!response.ok) throw new Error(`github_http_${response.status}`);
  try {return await response.json();} catch {throw new Error('invalid_json');}
 }
 const repos = new Map<number,{repo:Repository; categories:Set<string>}>();
 for (const [category,query] of CATEGORIES) {
  try {
   const data = await get(`/search/repositories?${new URLSearchParams({q:`${query} is:public archived:false`,sort:'updated',order:'desc',per_page:'5',page:'1'})}`) as {items?:unknown; incomplete_results?:boolean};
   if (!data || !Array.isArray(data.items)) throw new Error('invalid_search');
   if (data.incomplete_results) errors.push(`${category}:incomplete_search`);
   for (const item of data.items.slice(0,5)) {
    if (!validRepo(item)) {errors.push(`${category}:invalid_repository`); continue;}
    const prior = repos.get(item.id);
    if (prior) prior.categories.add(category); else repos.set(item.id,{repo:item,categories:new Set([category])});
   }
  } catch (error) {errors.push(`${category}:${(error as Error).message}`);}
  if (halted) break;
 }
 const candidates: ReturnType<typeof review>[] = [];
 for (const {repo,categories} of [...repos.values()].sort((a,b)=>a.repo.id-b.repo.id)) {
  let release: string|null=null, complete=true;
  try {
   const releases = await get(`/repos/${repo.full_name}/releases?per_page=5`);
   if (!Array.isArray(releases)) throw new Error('invalid_releases');
   const dates = releases.filter(r=>r && r.draft===false && r.prerelease===false && typeof r.published_at==='string' && Number.isFinite(Date.parse(r.published_at))).map(r=>r.published_at as string).sort().reverse();
   release=dates[0]??null;
  } catch(error) {complete=false; errors.push(`${repo.full_name}:${(error as Error).message}`);}
  candidates.push(review(repo,[...categories],now,release,complete));
 }
 candidates.sort((a,b)=>b.score-a.score || a.id-b.id);
 const probation_pending = candidates.filter(c=>c.state==='PROBATION_PENDING');
 return {schema_version:1, scanned_at:now.toISOString(), status:errors.length?'partial':'complete', sampling:'First 5 repositories per category, sorted by update; not exhaustive', candidates, probation_pending,
 human_gate_candidates:probation_pending.map(c=>({repository:c.repository,id:c.id,risk_level:3,status:'AWAITING_APPROVAL',action:'installation_or_privileged_integration'})), errors};
}
type Scan = Awaited<ReturnType<typeof scan>>;
async function atomic(path: string, content: string) {
 const temp=`${path}.${randomUUID()}.tmp`;
 await writeFile(temp,content,{mode:0o600}); await rename(temp,path);
}
export async function persist(result: Scan, root = '/mnt/data1/HUY-AI/state/ai-hr') {
 const dir=join(root,'github-radar'), queue=join(root,'probation-queue');
 await mkdir(join(dir,'history'),{recursive:true,mode:0o700}); await mkdir(queue,{recursive:true,mode:0o700});
 const id=`${result.scanned_at.replace(/[:.]/g,'-')}-${randomUUID()}`;
 const json=JSON.stringify(result,null,2)+'\n';
 const report=`# GitHub Radar\n\n${result.scanned_at} — ${result.status}. ${result.candidates.length} candidates; ${result.probation_pending.length} PROBATION_PENDING.\n\nMetadata only. Runtime activation requires a separate successful sandbox probation task; installation/privileged integration requires R3 Human Gate.\n\n| Repository | Score | License | State |\n|---|---:|---|---|\n${result.candidates.map(c=>`| ${c.repository} | ${c.score} | ${c.license.replace(/[^A-Za-z0-9.+-]/g,'')} | ${c.state} |`).join('\n')}\n\nScan warnings: ${result.errors.length}. ${result.sampling}.\n`;
 for (const candidate of result.probation_pending) {
  const manifest={schema_version:1,discovered_at:result.scanned_at,...candidate,untrusted_metadata:true,required_task:'isolated_sandbox_integration_and_probation',activation_requires:['sandbox_probation_passed','R3_human_approval'],integration_gate:{risk_level:3,status:'AWAITING_APPROVAL'},installation_authorized:false};
  try {await writeFile(join(queue,`github-${candidate.id}.json`),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});}
  catch(error) {if ((error as NodeJS.ErrnoException).code!=='EEXIST') throw error;}
 }
 await atomic(join(dir,'history',`${id}.json`),json);
 await atomic(join(dir,'latest.md'),report); await atomic(join(dir,'latest.json'),json);
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 try {
  const result=await scan({token:process.env.GITHUB_TOKEN});
  await persist(result,process.env.AI_HR_STATE_ROOT);
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.status!=='complete') process.exitCode=1;
 } catch {process.stderr.write('GitHub radar failed; no runtime integration performed.\n'); process.exitCode=1;}
}
