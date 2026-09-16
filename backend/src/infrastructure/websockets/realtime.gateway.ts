import { Inject, Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../application/interfaces/auth.interfaces';
import type { RealtimePublisher } from '../../domain/ports/realtime.port';

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, RealtimePublisher {
  @WebSocketServer()
  server!: Server;

  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      this.extractBearer(client.handshake.headers.authorization);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.tokens.verifyAccess(token);
      client.data.userId = payload.sub;
      await client.join(`agent:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('campaign:join')
  async joinCampaign(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { campaignId: string },
  ): Promise<{ ok: boolean }> {
    if (!client.data.userId || !body?.campaignId) {
      return { ok: false };
    }
    await client.join(`campaign:${body.campaignId}`);
    return { ok: true };
  }

  emitToAgent(agentId: string, event: string, payload: unknown): void {
    this.server?.to(`agent:${agentId}`).emit(event, payload);
  }

  emitToCampaign(campaignId: string, event: string, payload: unknown): void {
    this.server?.to(`campaign:${campaignId}`).emit(event, payload);
  }

  private extractBearer(header?: string): string | undefined {
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }
    return header.slice(7);
  }
}
