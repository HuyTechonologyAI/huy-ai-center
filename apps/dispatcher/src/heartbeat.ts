import os from 'node:os';
import { SupabaseClient } from '@supabase/supabase-js';
import { WorkerStatus } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';

export interface HeartbeatManagerConfig {
  nodeId: string;
  nodeName: string;
  intervalMs: number;
  capabilities: string[];
  maxConcurrency?: number;
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
    if (this.currentLoad > 0) {
      this.currentStatus = 'busy';
    } else {
      this.currentStatus = 'online';
    }
  }

  setStatus(status: WorkerStatus): void {
    this.currentStatus = status;
  }

  async register(): Promise<void> {
    this.logger.info(`Registering compute node: ${this.config.nodeId} (${this.config.nodeName})`);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const systemSpecs = {
      ramTotalBytes: totalMem,
      ramFreeBytes: freeMem,
      cpuCores: os.cpus().length,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
    };

    const { error } = await this.supabase.from('nodes').upsert(
      {
        node_id: this.config.nodeId,
        name: this.config.nodeName,
        hostname: os.hostname(),
        status: this.currentStatus,
        capabilities: this.config.capabilities,
        max_concurrency: this.config.maxConcurrency || 2,
        current_load: this.currentLoad,
        system_specs: systemSpecs,
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'node_id' }
    );

    if (error) {
      this.logger.warn('Could not register in nodes table (schema may be pending migration)', {
        error: error.message,
      });
    } else {
      this.logger.info('Node registered successfully in nodes table.');
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
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const now = new Date().toISOString();

    const systemSpecs = {
      ramTotalBytes: totalMem,
      ramFreeBytes: freeMem,
      cpuCores: os.cpus().length,
      os: `${os.type()} ${os.release()}`,
    };

    // 1. Update nodes table
    try {
      const { error: nodeErr } = await this.supabase
        .from('nodes')
        .update({
          status: this.currentStatus,
          current_load: this.currentLoad,
          system_specs: systemSpecs,
          last_heartbeat_at: now,
          updated_at: now,
        })
        .eq('node_id', this.config.nodeId);

      if (nodeErr) {
        this.logger.debug('Update nodes heartbeat notice', { message: nodeErr.message });
      }
    } catch {
      // Ignored for standalone mode
    }

    // 2. Insert telemetry row in node_heartbeats
    try {
      await this.supabase.from('node_heartbeats').insert({
        node_id: this.config.nodeId,
        status: this.currentStatus,
        current_load: this.currentLoad,
        ram_used_bytes: usedMem,
        ram_total_bytes: totalMem,
        system_specs: systemSpecs,
        recorded_at: now,
      });
    } catch {
      // Ignored if table not populated
    }

    this.logger.debug('Heartbeat emitted', {
      nodeId: this.config.nodeId,
      load: this.currentLoad,
      status: this.currentStatus,
    });
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    try {
      await this.supabase
        .from('nodes')
        .update({
          status: 'offline',
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('node_id', this.config.nodeId);
      this.logger.info('Marked node status offline on shutdown.');
    } catch (err) {
      this.logger.warn('Failed to mark offline on shutdown', { error: String(err) });
    }
  }
}
