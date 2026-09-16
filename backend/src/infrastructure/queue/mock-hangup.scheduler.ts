import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import type { HangupScheduler } from '../../domain/ports/realtime.port';
import { HandleZenviaWebhookUseCase } from '../../application/use-cases/webhooks/handle-zenvia-webhook.use-case';

const QUEUE_NAME = 'mock-hangup';

@Injectable()
export class MockHangupScheduler implements HangupScheduler, OnModuleDestroy {
  private readonly logger = new Logger(MockHangupScheduler.name);
  private readonly queue: Queue | null;
  private readonly worker: Worker | null;
  private readonly redis: IORedis | null;
  private readonly fallback = new Map<string, NodeJS.Timeout>();

  constructor(
    config: ConfigService,
    private readonly handleWebhook: HandleZenviaWebhookUseCase,
  ) {
    const url = config.get<string>('REDIS_URL');
    if (!url) {
      this.queue = null;
      this.worker = null;
      this.redis = null;
      return;
    }
    this.redis = new IORedis(url, { maxRetriesPerRequest: null });
    this.queue = new Queue(QUEUE_NAME, { connection: this.redis });
    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job<{ chamadaId: string }>) => {
        await this.fire(job.data.chamadaId);
      },
      { connection: this.redis },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Hangup job ${job?.id} failed: ${error.message}`);
    });
  }

  async scheduleMockHangup(chamadaId: string, delayMs: number): Promise<void> {
    if (this.queue) {
      await this.queue.add(
        'hangup',
        { chamadaId },
        { delay: delayMs, jobId: `hangup-${chamadaId}-${Date.now()}` },
      );
      return;
    }
    const previous = this.fallback.get(chamadaId);
    if (previous) {
      clearTimeout(previous);
    }
    const timer = setTimeout(() => {
      void this.fire(chamadaId);
    }, delayMs);
    this.fallback.set(chamadaId, timer);
  }

  async onModuleDestroy(): Promise<void> {
    for (const timer of this.fallback.values()) {
      clearTimeout(timer);
    }
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  private async fire(chamadaId: string): Promise<void> {
    await this.handleWebhook.execute({
      id: chamadaId,
      status_geral: 'finalizada',
      url_gravacao: `https://example.invalid/rec/${chamadaId}`,
      duracao_segundos: 18,
      duracao_falada_segundos: 12,
      duracao_cobrada_segundos: 60,
      preco: 0.13,
      motivo_desconexao: '16. normal',
      destino: {
        duracao_segundos: 18,
        duracao_falada_segundos: 12,
        duracao_cobrada_segundos: 60,
        preco: 0.13,
        motivo_desconexao: '16. normal',
        status: 'atendida',
      },
    });
  }
}
