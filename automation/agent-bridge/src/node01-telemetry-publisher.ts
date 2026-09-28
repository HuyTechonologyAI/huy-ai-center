import { execFileSync } from "node:child_process";
import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { cpus, freemem, totalmem, loadavg } from "node:os";
import { join } from "node:path";
import { redact } from "./log-redactor.js";

type Metrics = { cpu:number; ram:number; disk:number; ramFree:number; ramTotal:number; active:number; queue:number };
type PayloadInput = { timestamp:string; status:"ONLINE"|"DEGRADED"; metrics:Metrics; metadata?:Record<string,unknown> };
const NODE_ID="huy-ai-node-01";
const ROOT=process.env.HUY_AI_REPO ?? "/mnt/data1/HUY-AI/runtime/autonomy-control";
const STATE="/mnt/data1/HUY-AI/state";
const ENDPOINT=process.env.HUY_AI_TELEMETRY_URL ?? "https://www.huycncdsai.io.vn/api/node01/telemetry";
const KEY=process.env.HUY_AI_TELEMETRY_PRIVATE_KEY ?? "/home/huyadmin/.config/huy-ai/node01-telemetry-ed25519-private.pem";

function validPct(v:number){ return Number.isFinite(v)&&v>=0&&v<=100; }
function workers(v:unknown):Record<string,number>{
  if(!v||typeof v!=="object"||Array.isArray(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([,n])=>typeof n==="number"&&Number.isFinite(n)&&n>=0).map(([k,n])=>[k,Math.trunc(n as number)]));
}
export function sanitizeProviderSnapshot(raw:any){
  if(!raw||typeof raw!=="object") return {};
  return Object.fromEntries(["available","authenticated","circuit","consecutiveFailures","cooldownUntil"].filter(k=>raw[k]!==undefined).map(k=>[k,raw[k]]));
}
export function summarizeBacklogState(raw:any){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).map(([id,v]:any)=>[id,{status:String(v?.status??"UNKNOWN"),...(v?.reason?{reason:redact(String(v.reason))}:{})}]));
}
export function deriveRemoteSyncStatus(v:{behind:number;ahead:number}|null|undefined){
  if(!v||!Number.isInteger(v.behind)||!Number.isInteger(v.ahead)||v.behind<0||v.ahead<0) return "SYNC_PENDING";
  if(v.behind>0) return "DIVERGED_FAIL_CLOSED";
  return v.ahead>0?"SYNC_PENDING":"SYNCED";
}
export function buildTelemetryPayload(input:PayloadInput){
  const m=input.metrics;
  if(!m||![m.cpu,m.ram,m.disk].every(validPct)||![m.ramFree,m.ramTotal,m.active,m.queue].every(v=>Number.isFinite(v)&&v>=0)||m.ramFree>m.ramTotal) throw Error("INVALID_METRICS");
  const src=input.metadata??{}, allowed=["supervisorState","providerHealth","backlogTaskStatuses","runtimeWorkers","latestBottleneck","remoteSyncStatus"];
  const metadata:any=Object.fromEntries(allowed.filter(k=>k in src).map(k=>[k,(src as any)[k]]));
  metadata.runtimeWorkers=workers(metadata.runtimeWorkers);
  return {version:1 as const,nodeId:NODE_ID,timestamp:input.timestamp,status:input.status,metrics:m,metadata};
}
export function signTelemetryEnvelope(payload:unknown,privateKey:KeyObject){
  const body=JSON.stringify(payload);
  return {payload:body,signature:sign(null,Buffer.from(body),privateKey).toString("base64")};
}
function json(path:string){ try{return JSON.parse(readFileSync(path,"utf8"));}catch{return null;} }
function diskPct(){
  try{const line=execFileSync("df",["-Pk","/mnt/data1"],{encoding:"utf8"}).trim().split("\n").at(-1)??"";return Math.min(100,Math.max(0,Number(line.trim().split(/\s+/)[4]?.replace("%",""))||0));}catch{return 0;}
}
function runtimeWorkers(){
  let out=""; try{out=execFileSync("ps",["-eo","args="],{encoding:"utf8"});}catch{}
  const rules:{[k:string]:RegExp}={codex:/\bcodex exec\b/,antigravity:/\bagy -p\b/,claude:/\bclaude -p\b/,gemini:/\bgemini -p\b/};
  return Object.fromEntries(Object.entries(rules).map(([k,re])=>[k,out.split("\n").filter(x=>re.test(x)).length]));
}
function remoteSync(){
  try{const [behind,ahead]=execFileSync("git",["rev-list","--left-right","--count","HEAD...@{upstream}"],{cwd:ROOT,encoding:"utf8"}).trim().split(/\s+/).map(Number);return {behind,ahead};}catch{return null;}
}
function latestBottleneck(){
  try{const dir=join(STATE,"bottlenecks");return readdirSync(dir).filter(f=>f.endsWith(".md")).sort().at(-1)??null;}catch{return null;}
}
export async function publishOnce(){
  if(!existsSync(KEY)) throw Error("TELEMETRY_PRIVATE_KEY_MISSING");
  const hb=json(join(STATE,"supervisors","persistent-multi-ai-heartbeat.json"))??{};
  const backlog=json(join(ROOT,".artifacts","agent-bridge","backlog-state.json"))?.tasks??{};
  const rw=runtimeWorkers(), active=Object.values(rw).reduce((a,b)=>a+b,0), total=Math.round(totalmem()/1048576), free=Math.round(freemem()/1048576);
  const metrics:Metrics={cpu:Math.min(100,Math.max(0,loadavg()[0]/Math.max(1,cpus().length)*100)),ram:(1-free/Math.max(1,total))*100,disk:diskPct(),ramFree:free,ramTotal:total,active,queue:Object.values(backlog as any).filter((t:any)=>["PENDING","RUNNING","BLOCKED"].includes(t?.status)).length};
  const providers=Object.fromEntries(Object.entries(hb.providers??{}).map(([k,v])=>[k,sanitizeProviderSnapshot(v)]));
  const payload=buildTelemetryPayload({timestamp:new Date().toISOString(),status:"ONLINE",metrics,metadata:{supervisorState:String(hb.state??"UNKNOWN"),providerHealth:providers,backlogTaskStatuses:summarizeBacklogState(backlog),runtimeWorkers:rw,latestBottleneck:latestBottleneck(),remoteSyncStatus:deriveRemoteSyncStatus(remoteSync())}});
  const envelope=signTelemetryEnvelope(payload,createPrivateKey(readFileSync(KEY)));
  const res=await fetch(ENDPOINT,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(envelope),signal:AbortSignal.timeout(15000)});
  if(!res.ok) throw Error("TELEMETRY_HTTP_"+res.status);
  return payload;
}
async function main(){
  const once=process.argv.includes("--once");
  do{try{await publishOnce();console.log(new Date().toISOString(),"TELEMETRY_PASS");}catch(e){console.error(new Date().toISOString(),redact(String(e)));}if(once)break;await new Promise(r=>setTimeout(r,30000));}while(true);
}
if(import.meta.url===new URL(process.argv[1],"file:").href) void main();
