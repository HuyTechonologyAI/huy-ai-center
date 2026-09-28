import http from 'node:http';
import { createPrivateKey, randomBytes, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dispatchV2 } from '../../apps/dispatcher/dist/dispatcher-v2.js';

const DEFAULT_GATEWAY_URL =
  process.env.HUY_AI_07C_GATEWAY_URL ??
  'https://bdeluacbzbdflxubhpha.supabase.co/functions/v1/node01-07c-gateway';
const DEFAULT_GATEWAY_KEY =
  process.env.HUY_AI_07C_GATEWAY_PRIVATE_KEY ??
  '/home/huyadmin/.config/huy-ai/node01-07c-gateway-ed25519-private.pem';

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function boundedError(error) {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 300);
}

export function signGatewayEnvelope(operation, body, options = {}) {
  const privateKeyPath = options.privateKeyPath ?? DEFAULT_GATEWAY_KEY;
  const privateKey = createPrivateKey(readFileSync(privateKeyPath));
  const payload = JSON.stringify({
    version: 1,
    nodeId: 'huy-ai-node-01',
    timestamp: new Date().toISOString(),
    nonce: randomBytes(12).toString('base64url'),
    operation,
    body,
  });
  const signature = sign(null, Buffer.from(payload), privateKey).toString('base64');
  return { payload, signature };
}

export async function callSignedGateway(operation, body, options = {}) {
  const gatewayUrl = options.gatewayUrl ?? DEFAULT_GATEWAY_URL;
  const envelope = signGatewayEnvelope(operation, body, options);
  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(envelope),
    signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { error: 'GATEWAY_INVALID_JSON' };
  }
  if (!response.ok) {
    throw new Error(`GATEWAY_HTTP_${response.status}:${String(parsed?.error ?? '').slice(0, 160)}`);
  }
  return parsed;
}

export function createDispatcherV2Server(options = {}) {
  const queueGate = options.queueGate ?? process.env.DISPATCHER_V2_QUEUE_GATE ?? 'CLOSED_07C';
  const gatewayCall = options.gatewayCall ?? callSignedGateway;
  const executeOverride = options.executeOverride;

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, {
        status: 'ok',
        dispatcherV2Loaded: typeof dispatchV2 === 'function',
        queueGate,
        queueTransport: 'SIGNED_GATEWAY_V1',
        source: process.env.DISPATCHER_V2_SOURCE_SHA ?? 'UNKNOWN',
      });
    }

    if (req.method === 'GET' && url.pathname === '/ready') {
      return json(res, typeof dispatchV2 === 'function' ? 200 : 503, {
        ready: typeof dispatchV2 === 'function',
        queueGate,
        queueTransport: 'SIGNED_GATEWAY_V1',
      });
    }

    if (req.method === 'GET' && url.pathname === '/selftest') {
      const request = {
        organization_id: 'org-smoke',
        capabilities: ['smoke'],
        risk_level: 0,
        data_classification: 'PUBLIC',
        payload: {},
      };
      const coreDecision = await dispatchV2(request, {
        async loadContext() {
          return {
            organization_id: 'org-smoke',
            risk_ceiling: 0,
            data_classification_ceiling: 'PUBLIC',
            agents: [],
          };
        },
        async execute() {
          throw new Error('SELFTEST_EXECUTION_MUST_NOT_RUN');
        },
      });
      return json(res, 200, { coreDecision, queueGate });
    }

    if (req.method === 'POST' && url.pathname === '/queue/once') {
      if (queueGate !== 'OPEN_07C') {
        return json(res, 503, { error: 'QUEUE_GATE_CLOSED_07C' });
      }

      try {
        const polled = await gatewayCall('poll_claim', {});
        if (!polled?.job) {
          return json(res, 200, { status: 'IDLE', queueGate });
        }

        const job = polled.job;
        const decision = await dispatchV2(job.request, {
          async loadContext() {
            return job.context;
          },
          async execute(agentId, request) {
            if (executeOverride) return executeOverride(agentId, request);
            throw new Error('07C_CANARY_EXECUTION_FORBIDDEN');
          },
        });

        if (decision.allowed) {
          throw new Error('07C_CANARY_UNEXPECTEDLY_ALLOWED');
        }
        if (decision.reason !== 'NO_ELIGIBLE_AGENT') {
          throw new Error(`07C_CANARY_UNEXPECTED_DECISION:${decision.reason}`);
        }

        const finalized = await gatewayCall('finalize_canary', {
          taskId: job.taskId,
          msgId: job.msgId,
          decisionReason: decision.reason,
        });

        return json(res, 200, {
          status: 'CANARY_PROCESSED',
          taskId: job.taskId,
          msgId: job.msgId,
          decision,
          finalized: Boolean(finalized?.finalized),
          archived: Boolean(finalized?.archived),
        });
      } catch (error) {
        return json(res, 502, { error: boundedError(error) });
      }
    }

    if (req.method === 'POST' && url.pathname === '/dispatch') {
      if (queueGate !== 'OPEN_07C') {
        return json(res, 503, { error: 'QUEUE_GATE_CLOSED_07C' });
      }
      return json(res, 501, { error: 'DIRECT_DISPATCH_NOT_ENABLED_USE_QUEUE_ONCE' });
    }

    return json(res, 404, { error: 'NOT_FOUND' });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const host = process.env.DISPATCHER_V2_HOST ?? '127.0.0.1';
  const port = Number(process.env.DISPATCHER_V2_PORT ?? '18081');
  const queueGate = process.env.DISPATCHER_V2_QUEUE_GATE ?? 'CLOSED_07C';

  if (host !== '127.0.0.1') {
    console.error('DISPATCHER_V2_BIND_DENIED: host must be 127.0.0.1');
    process.exit(2);
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error('DISPATCHER_V2_PORT_INVALID');
    process.exit(2);
  }

  const server = createDispatcherV2Server({ host, port, queueGate });
  server.listen(port, host, () => {
    console.log(JSON.stringify({
      event: 'DISPATCHER_V2_READY',
      host,
      port,
      queueGate,
      queueTransport: 'SIGNED_GATEWAY_V1',
      source: process.env.DISPATCHER_V2_SOURCE_SHA ?? 'UNKNOWN',
    }));
  });

  const shutdown = (signal) => {
    console.log(JSON.stringify({ event: 'DISPATCHER_V2_SHUTDOWN', signal }));
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
