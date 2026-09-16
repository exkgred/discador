import { Injectable } from '@nestjs/common';
import type {
  AgentSession,
  AgentSessionPort,
} from '../../domain/ports/realtime.port';

@Injectable()
export class InMemoryAgentSession implements AgentSessionPort {
  private readonly sessions = new Map<string, AgentSession>();

  async set(session: AgentSession): Promise<void> {
    this.sessions.set(session.userId, session);
  }

  async get(userId: string): Promise<AgentSession | null> {
    return this.sessions.get(userId) ?? null;
  }

  async clear(userId: string): Promise<void> {
    this.sessions.delete(userId);
  }
}
