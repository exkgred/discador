import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessRuleError } from '../../domain/errors/domain-error';
import type {
  CallInfo,
  PlaceCallInput,
  PlaceCallResult,
  WebphoneInfo,
  ZenviaVoicePort,
} from '../../domain/ports/zenvia-voice.port';

interface ZenviaEnvelope<T> {
  status?: number;
  sucesso?: boolean;
  mensagem?: string;
  dados?: T;
}

@Injectable()
export class HttpZenviaVoiceAdapter implements ZenviaVoicePort {
  private readonly logger = new Logger(HttpZenviaVoiceAdapter.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config
      .get<string>('ZENVIA_BASE_URL', 'https://voice-api.zenvia.com')
      .replace(/\/$/, '');
    this.token = this.config.get<string>('ZENVIA_ACCESS_TOKEN', '');
  }

  async placeCall(input: PlaceCallInput): Promise<PlaceCallResult> {
    const body = await this.request<ZenviaEnvelope<{ id?: number | string }>>(
      'POST',
      '/chamada',
      {
        numero_origem: input.origin,
        numero_destino: input.destination,
        gravar_audio: input.recordAudio,
        tags: input.tags,
      },
    );
    const id = body.dados?.id;
    if (!id) {
      throw new BusinessRuleError(
        body.mensagem ?? 'Zenvia não retornou id da chamada',
      );
    }
    return { chamadaId: String(id), mock: false };
  }

  async getCall(chamadaId: string): Promise<CallInfo | null> {
    const body = await this.request<
      ZenviaEnvelope<{
        id?: number | string;
        status_geral?: string;
        url_gravacao?: string;
        destino?: {
          duracao_segundos?: number;
          duracao_falada_segundos?: number;
          duracao_cobrada_segundos?: number;
          preco?: number;
          motivo_desconexao?: string;
        };
      }>
    >('GET', `/chamada/${encodeURIComponent(chamadaId)}`);
    const data = body.dados;
    if (!data?.id) {
      return null;
    }
    return {
      chamadaId: String(data.id),
      status: data.status_geral ?? 'desconhecido',
      recordingUrl: data.url_gravacao ?? null,
      durationSeconds: data.destino?.duracao_segundos ?? null,
      spokenSeconds: data.destino?.duracao_falada_segundos ?? null,
      billedSeconds: data.destino?.duracao_cobrada_segundos ?? null,
      price: data.destino?.preco ?? null,
      disconnectReason: data.destino?.motivo_desconexao ?? null,
    };
  }

  async hangup(chamadaId: string): Promise<void> {
    await this.request('DELETE', `/chamada/${encodeURIComponent(chamadaId)}`);
  }

  async getWebphoneUrl(ramalId: string): Promise<WebphoneInfo> {
    const query = new URLSearchParams({
      tipo: 'hidden',
      id_ramal: ramalId,
    });
    const body = await this.request<ZenviaEnvelope<{ url?: string } | string>>(
      'GET',
      `/webphone?${query.toString()}`,
    );
    const dados = body.dados;
    const url =
      typeof dados === 'string'
        ? dados
        : dados && typeof dados === 'object'
          ? (dados.url ?? null)
          : null;
    return { url, mock: false };
  }

  private async request<T>(
    method: string,
    path: string,
    payload?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.token) {
      throw new BusinessRuleError('ZENVIA_ACCESS_TOKEN não configurado');
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': this.token,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const text = await response.text();
    let parsed: T;
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      this.logger.error(`Zenvia ${method} ${path} invalid JSON`);
      throw new BusinessRuleError('Resposta inválida da API de voz');
    }
    if (!response.ok) {
      const message =
        typeof parsed === 'object' &&
        parsed &&
        'mensagem' in parsed &&
        typeof (parsed as { mensagem?: string }).mensagem === 'string'
          ? (parsed as { mensagem: string }).mensagem
          : `Erro Zenvia HTTP ${response.status}`;
      throw new BusinessRuleError(message);
    }
    return parsed;
  }
}
