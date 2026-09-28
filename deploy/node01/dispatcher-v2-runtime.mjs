import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { dispatchV2 } from '../../apps/dispatcher/dist/dispatcher-v2.js';

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

export function createDispatcherV2Server(options = {}) {
  const queueGate = options.queueGate ?? process.env.DISPATCHER_V2_QUEUE_GATE ?? 'CLOSED_07C';
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, {
        status: 'ok',
        dispatcherV2Loaded: typeof dispatchV2 === 'function',
        queueGate,
        source: process.env.DISPATCHER_V2_SOURCE_SHA ?? 'UNKNOWN',
      });
    }

    if (req.method === 'GET' && url.pathname === '/ready') {
      return json(res, typeof dispatchV2 === 'function' ? 200 : 503, {
        ready: typeof dispatchV2 === 'function',
        queueGate,
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

    if (req.method === 'POST' && url.pathname === '/dispatch') {
      if (queueGate !== 'OPEN_07C') {
        return json(res, 503, { error: 'QUEUE_GATE_CLOSED_07C' });
      }
      return json(res, 501, { error: 'QUEUE_TRANSPORT_REQUIRES_07C_APPROVAL' });
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
