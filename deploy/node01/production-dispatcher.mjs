import { createHash, randomUUID } from 'node:crypto';
import { dispatchV2 } from '../../apps/dispatcher/dist/dispatcher-v2.js';
export const LOCAL_CAPABILITIES = ['summarization', 'code_reading', 'log_analysis', 'json_analysis', 'text_analysis'];
export function resultDigest(output) { return createHash('sha256').update(JSON.stringify(output)).digest('hex'); }
/** Production text-analysis worker. No shell, file mutation, or external tools are exposed to the model. */
export async function runProductionOnce({ store, provider, organizationId, gate = 'CLOSED', authorize = dispatchV2, timeoutMs = 60000 }) {
    if (gate !== 'OPEN_PRODUCTION')
        return { status: 'GATE_CLOSED' };
    if (!organizationId || !Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
        return { status: 'CONFIG_DENIED' };
    const candidate = await store.poll(organizationId);
    if (!candidate)
        return { status: 'IDLE' };
    if (candidate.organization_id !== organizationId || !Number.isInteger(candidate.risk_level) || candidate.risk_level < 0 || candidate.risk_level > 2 || candidate.approval_required !== false || candidate.approval_status !== 'NOT_REQUIRED')
        return { status: 'RISK_OR_ORG_DENIED' };
    if (candidate.expires_at && (!Number.isFinite(Date.parse(candidate.expires_at)) || Date.parse(candidate.expires_at) <= Date.now()))
        return { status: 'TASK_EXPIRED' };
    if (candidate.status !== 'QUEUED' || typeof candidate.idempotency_key !== 'string' || !candidate.idempotency_key.trim() || !Number.isSafeInteger(candidate.retry_count) || candidate.retry_count < 0 || !Number.isSafeInteger(candidate.max_retries) || candidate.max_retries < 0 || candidate.max_retries > 10 || candidate.retry_count > candidate.max_retries)
        return { status: 'LIFECYCLE_DENIED' };
    if (!LOCAL_CAPABILITIES.includes(candidate.assigned_capability) || !provider.capabilities.includes(candidate.assigned_capability))
        return { status: 'CAPABILITY_DENIED' };
    if (typeof candidate.input?.prompt !== 'string' || !candidate.input.prompt.trim() || Buffer.byteLength(candidate.input.prompt) > 65536)
        return { status: 'INPUT_DENIED' };
    let task = await store.compareAndSwap(candidate, { status: 'CLAIMED', claimed_by_node_id: 'production:' + randomUUID(), claimed_at: new Date().toISOString() });
    if (!task)
        return { status: 'CLAIM_RACE' };
    async function transition(status, extra = {}) {
        const updated = await store.compareAndSwap(task, { ...extra, status });
        if (!updated)
            throw new Error('LEASE_LOST');
        task = updated;
    }
    const controller = new AbortController();
    let timer;
    try {
        const request = { organization_id: organizationId, capabilities: [task.assigned_capability], risk_level: task.risk_level, data_classification: task.data_classification, payload: task.input };
        const decision = await authorize(request, { loadContext: () => store.loadContext(organizationId), execute: async (agentId) => {
                await transition('RUNNING', { assigned_agent_id: agentId, started_at: new Date().toISOString() });
                const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('PROVIDER_TIMEOUT')); }, timeoutMs); });
                const output = await Promise.race([provider.execute(task.input, { signal: controller.signal, idempotencyKey: task.idempotency_key }), timeout]);
                clearTimeout(timer);
                if (!output || typeof output.text !== 'string' || !output.text.trim() || Buffer.byteLength(output.text) > 65536)
                    throw new Error('OUTPUT_QA_FAILED');
                await transition('REVIEWING');
                const digest = resultDigest(output);
                await store.writeStep(task, 'RESULT', { verified: true, digest, output });
                await store.writeStep(task, 'REVIEW', { passed: true, resultDigest: digest, policy: 'bounded-nonempty-text-v1' });
                await transition('FINALIZING');
                await transition('COMPLETED', { output, completed_at: new Date().toISOString(), claimed_by_node_id: null, claimed_at: null });
            } });
        if (!decision.allowed)
            throw new Error('DISPATCH_DENIED');
        return { status: task.status, taskId: task.id };
    }
    catch {
        // A lost lease never authorizes another write. CAS is also enforced on every error transition.
        if (['CLAIMED', 'RUNNING'].includes(task.status)) {
            try {
                await transition('RETRY_WAIT');
            }
            catch {
                return { status: 'LEASE_LOST', taskId: task.id };
            }
        }
        return { status: task.status, taskId: task.id };
    }
    finally {
        clearTimeout(timer);
        controller.abort();
    }
}
