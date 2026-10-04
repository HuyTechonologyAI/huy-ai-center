import { createClient } from '@supabase/supabase-js';
import { createProductionStore, nativeOllamaProvider } from './production-store.mjs';
import { runProductionOnce } from './production-dispatcher.mjs';
import { reconciliationDecision, reconcileTask } from './task-reconciler.mjs';
// Explicit organization and gate; invoking without the gate performs read-only reconciliation.
const organizationId = process.env.PRODUCTION_ORGANIZATION_ID;
if (!organizationId || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('PRODUCTION_CONFIG_REQUIRED');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10000) }) } });
const store = createProductionStore(db, organizationId);
const gate = process.env.PRODUCTION_EXECUTION_GATE;
for (const task of await store.staleTasks()) {
    const options = { organizationId, now: Date.now() };
    const result = gate === 'OPEN_PRODUCTION' ? await reconcileTask(task, store, options) : reconciliationDecision(task, await store.loadSteps(task.id, organizationId), options);
    console.log(JSON.stringify({ taskId: task.id, reconciliation: result }));
}
console.log(JSON.stringify(await runProductionOnce({ store, provider: nativeOllamaProvider({ model: process.env.HUY_AI_LOCAL_MODEL }), organizationId, gate })));
