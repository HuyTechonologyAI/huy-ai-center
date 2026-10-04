import { isDeepStrictEqual } from 'node:util';
import { randomUUID } from 'node:crypto';
import { LOCAL_CAPABILITIES } from './production-dispatcher.mjs';
export function createProductionStore(db, organizationId) {
    if (!organizationId)
        throw new Error('ORG_REQUIRED');
    const checked = async (query) => { const r = await query; if (r.error)
        throw new Error('DATABASE_OPERATION_FAILED'); return r.data; };
    return {
        async poll(org) {
            if (org !== organizationId)
                throw new Error('ORG_DENIED');
            const rows = await checked(db.from('ai_tasks').select('*').eq('organization_id', org).eq('status', 'QUEUED').lte('risk_level', 2).eq('approval_required', false).eq('approval_status', 'NOT_REQUIRED').in('assigned_capability', LOCAL_CAPABILITIES).order('created_at').limit(1));
            return rows?.[0] ?? null;
        },
        async compareAndSwap(task, patch) {
            if (task.organization_id !== organizationId)
                throw new Error('ORG_DENIED');
            const rows = await checked(db.from('ai_tasks').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', task.id).eq('organization_id', organizationId).eq('state_version', task.state_version).eq('status', task.status).eq('updated_at', task.updated_at).select('*'));
            return rows?.length === 1 ? rows[0] : null;
        },
        async loadContext(org) {
            if (org !== organizationId)
                throw new Error('ORG_DENIED');
            const orgRow = await checked(db.from('organizations').select('id,status,data_classification_ceiling').eq('id', org).single());
            if (orgRow.status !== 'ACTIVE')
                throw new Error('ORG_INACTIVE');
            const agents = await checked(db.from('agents').select('id,organization_id,enabled,health_status,current_agent_version_id').eq('organization_id', org).eq('enabled', true));
            const ids = agents.map(a => a.current_agent_version_id).filter(Boolean);
            const versions = ids.length ? await checked(db.from('agent_versions').select('id,agent_id,version,agent_card,agent_card_hash').in('id', ids)) : [];
            return { organization_id: org, risk_ceiling: 2, data_classification_ceiling: orgRow.data_classification_ceiling,
                agents: agents.flatMap(a => { const v = versions.find(v => v.id === a.current_agent_version_id && v.agent_id === a.id); return v ? [{ ...a, version_id: v.id, version_agent_id: v.agent_id, version: v.version, agent_card_hash: v.agent_card_hash, card: v.agent_card }] : []; }) };
        },
        async writeStep(task, type, payload) {
            if (task.organization_id !== organizationId)
                throw new Error('ORG_DENIED');
            const key = task.id + ':' + (task.retry_count + 1) + ':' + type;
            const row = { task_id: task.id, message_id: randomUUID(), message_type: type, intent: 'PRODUCTION_LOCAL_ANALYSIS', sender_type: 'AGENT', sender_id: task.assigned_agent_id ?? 'production-dispatcher', recipient_type: 'SYSTEM', recipient_id: 'production-dispatcher', sender_organization_id: organizationId, recipient_organization_id: organizationId, status: 'COMPLETED', attempt: task.retry_count + 1, idempotency_key: key, result_payload: payload };
            const result = await db.from('ai_task_steps').insert(row);
            if (result.error) {
                if (result.error.code !== '23505')
                    throw new Error('STEP_WRITE_FAILED');
                const old = await checked(db.from('ai_task_steps').select('result_payload').eq('task_id', task.id).eq('sender_organization_id', organizationId).eq('idempotency_key', key).single());
                if (!isDeepStrictEqual(old.result_payload, payload))
                    throw new Error('IDEMPOTENCY_CONFLICT');
            }
        },
        async loadSteps(taskId, org) {
            if (org !== organizationId)
                throw new Error('ORG_DENIED');
            return await checked(db.from('ai_task_steps').select('*').eq('task_id', taskId).eq('sender_organization_id', org).eq('recipient_organization_id', org));
        },
        async staleTasks() { return await checked(db.from('ai_tasks').select('*').eq('organization_id', organizationId).in('status', ['CLAIMED', 'RUNNING', 'REVIEWING', 'FINALIZING', 'RETRY_WAIT']).lt('updated_at', new Date(Date.now() - 120000).toISOString()).limit(20)); },
    };
}
export function nativeOllamaProvider({ model = 'qwen2.5-coder:3b', fetchImpl = fetch } = {}) {
    return { capabilities: LOCAL_CAPABILITIES, async execute(input, { signal }) {
            const response = await fetchImpl('http://127.0.0.1:11434/api/generate', { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt: input.prompt, stream: false, options: { temperature: 0, num_predict: 768 } }), signal });
            if (!response.ok)
                throw new Error('OLLAMA_HTTP_FAILED');
            const body = await response.json();
            if (body.done !== true || typeof body.response !== 'string' || !body.response.trim() || Buffer.byteLength(body.response) > 65536)
                throw new Error('OLLAMA_INVALID_OUTPUT');
            return { text: body.response };
        } };
}
