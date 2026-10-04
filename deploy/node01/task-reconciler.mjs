import { randomUUID, createHash } from 'node:crypto';
function verifiedResult(task, steps, organizationId) {
    const attempt = task.retry_count + 1;
    const evidence = steps.filter(s => s.task_id === task.id && s.sender_organization_id === organizationId && s.recipient_organization_id === organizationId && s.attempt === attempt && s.status === 'COMPLETED');
    const result = evidence.find(s => s.message_type === 'RESULT' && s.result_payload?.verified === true && /^[a-f0-9]{64}$/.test(s.result_payload.digest ?? '') && s.result_payload.output && createHash('sha256').update(JSON.stringify(s.result_payload.output)).digest('hex') === s.result_payload.digest);
    const qa = result && evidence.find(s => s.message_type === 'REVIEW' && s.result_payload?.passed === true && s.result_payload.resultDigest === result.result_payload.digest);
    return qa ? result : null;
}
/** Pure policy: caller loads trusted, organization-scoped durable steps and applies a version CAS. */
export function reconciliationDecision(task, steps, { now = Date.now(), organizationId, leaseMs = 120000 } = {}) {
    const noop = reason => ({ status: 'NOOP', reason });
    if (!organizationId || task.organization_id !== organizationId)
        return noop('ORG_DENIED');
    if (!Number.isInteger(task.risk_level) || task.risk_level < 0 || task.risk_level > 2 || task.approval_required !== false || task.approval_status !== 'NOT_REQUIRED')
        return noop('RISK_GATE');
    if (!['CLAIMED', 'RUNNING', 'REVIEWING', 'FINALIZING', 'RETRY_WAIT'].includes(task.status))
        return noop('NOT_CLAIMED');
    if (!Number.isSafeInteger(task.state_version) || task.state_version < 0 || !Number.isSafeInteger(task.retry_count) || task.retry_count < 0 || !Number.isSafeInteger(task.max_retries) || task.max_retries < 0 || task.max_retries > 10)
        return noop('INVALID_LIFECYCLE');
    const updated = Date.parse(task.updated_at);
    if (!Number.isFinite(now) || !Number.isFinite(updated) || !Number.isFinite(leaseMs) || leaseMs < 1000 || now - updated < leaseMs)
        return noop('LEASE_NOT_EXPIRED');
    const qa = task.status === 'RETRY_WAIT' ? null : verifiedResult(task, steps, organizationId);
    const status = qa ? 'COMPLETED' : task.status === 'FINALIZING' ? 'FAILED' : task.retry_count < task.max_retries ? 'QUEUED' : 'FAILED';
    return { status, reason: qa ? 'VERIFIED_RESULT_AND_QA' : status === 'QUEUED' ? 'LEASE_RETRY' : 'RETRY_EXHAUSTED',
        expectedVersion: task.state_version, retryCount: task.retry_count + (status === 'QUEUED' ? 1 : 0) };
}
export async function reconcileTask(task, ports, options) {
    const steps = await ports.loadSteps(task.id, options.organizationId);
    const decision = reconciliationDecision(task, steps, options);
    if (decision.status === 'NOOP')
        return decision;
    // Fence the expired owner before traversing the existing DB state machine.
    let current = await ports.compareAndSwap(task, { status: task.status, claimed_by_node_id: 'reconciler:' + randomUUID() });
    if (!current)
        return { ...decision, applied: false };
    let path;
    if (decision.status === 'COMPLETED') {
        const order = current.status === 'RETRY_WAIT' ? ['RETRY_WAIT', 'QUEUED', 'CLAIMED', 'RUNNING', 'REVIEWING', 'FINALIZING', 'COMPLETED'] : ['CLAIMED', 'RUNNING', 'REVIEWING', 'FINALIZING', 'COMPLETED'];
        if (!order.includes(current.status))
            return { ...decision, applied: false };
        path = order.slice(order.indexOf(current.status) + 1);
    }
    else if (current.status === 'FINALIZING')
        path = ['FAILED'];
    else if (current.status === 'REVIEWING')
        path = decision.status === 'FAILED' ? ['FAILED'] : ['CORRECTING', 'RUNNING', 'RETRY_WAIT', 'QUEUED'];
    else
        path = current.status === 'RETRY_WAIT' ? [decision.status] : ['RETRY_WAIT', decision.status];
    for (const status of path) {
        const final = status === decision.status;
        const patch = { status, ...(final ? { retry_count: decision.retryCount, claimed_by_node_id: null, claimed_at: null } : {}),
            ...(status === 'COMPLETED' ? { completed_at: new Date(options.now ?? Date.now()).toISOString(), output: verifiedResult(task, steps, options.organizationId)?.result_payload.output } : {}), };
        const next = await ports.compareAndSwap(current, patch);
        if (!next)
            return { ...decision, applied: false };
        current = next;
    }
    return { ...decision, applied: true };
}
