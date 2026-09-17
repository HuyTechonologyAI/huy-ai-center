import http from 'node:http';
import { Logger } from '@huy-ai/shared';

export interface HealthServerOptions {
  port: number;
  workerId: string;
  getActiveJobs: () => number;
  isReady: () => boolean;
}

export class HealthServer {
  private server: http.Server | null = null;
  private options: HealthServerOptions;
  private logger: Logger;

  constructor(options: HealthServerOptions, logger: Logger) {
    this.options = options;
    this.logger = logger.child('HealthServer');
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        const url = req.url || '/';

        if (url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'ok',
              service: 'huy-ai-dispatcher',
              workerId: this.options.workerId,
              uptimeSeconds: Math.floor(process.uptime()),
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        if (url === '/ready') {
          const ready = this.options.isReady();
          const statusCode = ready ? 200 : 503;
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              ready,
              workerId: this.options.workerId,
              activeJobs: this.options.getActiveJobs(),
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        // Not Found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found. Use /health or /ready' }));
      });

      this.server.listen(this.options.port, () => {
        this.logger.info(`Health check HTTP server listening on port ${this.options.port} (/health, /ready)`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => {
        this.logger.info('Health check HTTP server closed');
        resolve();
      });
    });
  }
}
