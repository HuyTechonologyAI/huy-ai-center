import os from 'node:os';
import { SupabaseClient } from '@supabase/supabase-js';
import { WorkerHeartbeat, WorkerStatus } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';

export interface HeartbeatManagerConfig {
  nodeId: string;
  nodeName: string;
  intervalMs: number;
  capabilities: string[];
}

export class HeartbeatManager {
  private supabase: SupabaseClient;
  private config: HeartbeatManagerConfig;
  private logger: Logger;
  private timer: NodeJS.Timeout | null = null;
  private currentStatus: WorkerStatus = 'online';
  private currentLoad = 0;

  constructor(
    supabase: SupabaseClient,
    config: HeartbeatManagerConfig,
    logger: Logger
  ) {
    this.supabase = supabase;
    this.config = config;
    this.logger = logger.child('Heartbeat');
  }

  setLoad(load: number): void {
    this.currentLoad = Math.max(0, load);
  }

  setStatus(status: WorkerStatus): void {
    this.currentStatus = status;
  }

  async register(): Promise<void> {
    this.logger.info(`Registering worker node: ${this.config.nodeId} (${this.config.nodeName})`);
    const systemSpecs = {
      ramTotalBytes: os.totalmem(),
      ramFreeBytes: os.freemem(),
      cpuCores: os.cpus().length,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
    };

    const { error } = await this.supabase.from('ai_worker_nodes').upsert(
      {
        node_id: this.config.nodeId,
        name: this.config.nodeName,
        hostname: os.hostname(),
        status: this.currentStatus,
        capabilities: this.config.capabilities,
        system_specs: systemSpecs,
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'node_id' }
    );

    if (error) {
      this.logger.error('Failed to register worker node in Supabase', error);
    } else {
      this.logger.info('Worker node registered successfully in Supabase');
    }
  }

  start(): void {
    this.timer = setInterval(() => {
      this.sendHeartbeat().catch((err) => {
        this.logger.warn('Heartbeat tick failed', { error: String(err) });
      });
    }, this.config.intervalMs);
  }

  async sendHeartbeat(): Promise<void> {
    const heartbeat: WorkerHeartbeat = {
      nodeId: this.config.nodeId,
      status: this.currentStatus,
      currentLoad: this.currentLoad,
      systemSpecs: {
        ramTotalBytes: os.totalmem(),
        ramFreeBytes: os.freemem(),
        cpuCores: os.cpus().length,
        os: `${os.type()} ${os.release()}`,
      },
      timestamp: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('ai_worker_nodes')
      .update({
        status: heartbeat.status,
        current_load: heartbeat.currentLoad,
        system_specs: heartbeat.systemSpecs,
        last_heartbeat_at: heartbeat.timestamp,
        updated_at: heartbeat.timestamp,
      })
      .eq('node_id', heartbeat.nodeId);

    if (error) {
      this.logger.warn('Failed to send heartbeat to Supabase', { error: error.message });
    } else {
      this.logger.debug('Heartbeat reported', { load: this.currentLoad, status: this.currentStatus });
    }
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    try {
      await this.supabase
        .from('ai_worker_nodes')
        .update({
          status: 'offline',
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('node_id', this.config.nodeId);
      this.logger.info('Reported offline status before shutdown');
    } catch (err) {
      this.logger.warn('Failed to mark offline on shutdown', { error: String(err) });
    }
  }
}
