import { Inject, Injectable } from '@nestjs/common';
import {
  AGENT_SESSION_PORT,
  type AgentSessionPort,
} from '../../../domain/ports/realtime.port';
import {
  CALL_REPOSITORY,
  type CallRepository,
} from '../../../domain/repositories/call.repository';
import {
  CAMPAIGN_REPOSITORY,
  type CampaignRepository,
} from '../../../domain/repositories/campaign.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';

@Injectable()
export class GetSupervisorOverviewUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CALL_REPOSITORY) private readonly calls: CallRepository,
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
    @Inject(AGENT_SESSION_PORT) private readonly sessions: AgentSessionPort,
  ) {}

  async execute() {
    const [people, callPage, campaigns] = await Promise.all([
      this.users.list(),
      this.calls.list({ page: 1, perPage: 500 }),
      this.campaigns.list(),
    ]);
    const agents = people.filter((user) => user.role === 'AGENT');
    const queues = await Promise.all(
      campaigns.map(async (campaign) => ({
        campaign,
        queue: await this.campaigns.listQueue(campaign.id),
      })),
    );

    const rows = await Promise.all(
      agents.map(async (agent) => {
        const mine = callPage.items.filter((call) => call.agentId === agent.id);
        const answered = mine.filter((call) => call.disposition === 'ANSWERED').length;
        const talkSeconds = mine.reduce(
          (sum, call) => sum + (call.durationSeconds ?? 0),
          0,
        );
        const session = await this.sessions.get(agent.id);
        const live = mine.find(
          (call) => call.status === 'RINGING' || call.status === 'IN_CALL',
        );
        const status =
          session?.status ??
          (live?.status === 'RINGING'
            ? 'ringing'
            : live?.status === 'IN_CALL'
              ? 'in_call'
              : mine.length > 0
                ? 'idle'
                : 'offline');
        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          ramalId: agent.ramalId,
          status,
          campaignName:
            campaigns.find((item) => item.id === session?.campaignId)?.name ??
            null,
          leadName: live ? live.leadId : null,
          statusSince: live?.startedAt?.toISOString() ?? null,
          calls: mine.length,
          answered,
          noAnswer: mine.filter(
            (call) =>
              call.disposition === 'NO_ANSWER' || call.disposition === 'BUSY',
          ).length,
          talkSeconds,
          ahtSeconds: answered ? Math.round(talkSeconds / answered) : 0,
          contactRate: mine.length
            ? Math.round((answered / mine.length) * 100)
            : 0,
          lastDisposition: mine[0]?.disposition ?? null,
        };
      }),
    );

    const answered = callPage.items.filter(
      (call) => call.disposition === 'ANSWERED',
    ).length;
    const talkSeconds = callPage.items.reduce(
      (sum, call) => sum + (call.durationSeconds ?? 0),
      0,
    );

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        agentsOnline: rows.filter((item) => item.status !== 'offline').length,
        agentsInCall: rows.filter(
          (item) => item.status === 'in_call' || item.status === 'ringing',
        ).length,
        calls: callPage.total,
        answered,
        contactRate: callPage.total
          ? Math.round((answered / callPage.total) * 100)
          : 0,
        talkSeconds,
        ahtSeconds: answered ? Math.round(talkSeconds / answered) : 0,
        pendingQueue: queues.reduce(
          (sum, item) =>
            sum + item.queue.filter((row) => row.status === 'PENDING').length,
          0,
        ),
      },
      agents: rows,
      campaigns: queues.map((item) => ({
        id: item.campaign.id,
        name: item.campaign.name,
        pending: item.queue.filter((row) => row.status === 'PENDING').length,
        done: item.queue.filter((row) =>
          ['DONE', 'NO_ANSWER', 'CALLBACK', 'DNC'].includes(row.status),
        ).length,
        live: item.queue.filter((row) =>
          ['DIALING', 'IN_CALL'].includes(row.status),
        ).length,
      })),
      recentCalls: callPage.items.slice(0, 12),
    };
  }
}
