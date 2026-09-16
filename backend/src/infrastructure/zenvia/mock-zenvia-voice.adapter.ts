import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import type {
  CallInfo,
  PlaceCallInput,
  PlaceCallResult,
  WebphoneInfo,
  ZenviaVoicePort,
} from '../../domain/ports/zenvia-voice.port';
import {
  HANGUP_SCHEDULER,
  type HangupScheduler,
} from '../../domain/ports/realtime.port';

@Injectable()
export class MockZenviaVoiceAdapter implements ZenviaVoicePort {
  private readonly logger = new Logger(MockZenviaVoiceAdapter.name);
  private readonly calls = new Map<string, CallInfo>();

  constructor(
    @Inject(HANGUP_SCHEDULER) private readonly hangups: HangupScheduler,
    private readonly config: ConfigService,
  ) {}

  async placeCall(input: PlaceCallInput): Promise<PlaceCallResult> {
    const chamadaId = String(randomInt(10_000_000, 99_999_999));
    this.calls.set(chamadaId, {
      chamadaId,
      status: 'curso',
      recordingUrl: null,
      durationSeconds: null,
      spokenSeconds: null,
      billedSeconds: null,
      price: null,
      disconnectReason: null,
    });
    this.logger.log(
      `Mock call ${chamadaId} ${input.origin} -> ${input.destination}`,
    );
    const delay = Number(this.config.get('MOCK_CALL_DURATION_MS', '6000'));
    await this.hangups.scheduleMockHangup(chamadaId, delay);
    return { chamadaId, mock: true };
  }

  async getCall(chamadaId: string): Promise<CallInfo | null> {
    return this.calls.get(chamadaId) ?? null;
  }

  async hangup(chamadaId: string): Promise<void> {
    const current = this.calls.get(chamadaId);
    if (current) {
      this.calls.set(chamadaId, { ...current, status: 'finalizada' });
    }
    await this.hangups.scheduleMockHangup(chamadaId, 50);
  }

  async getWebphoneUrl(): Promise<WebphoneInfo> {
    return { url: null, mock: true };
  }
}
