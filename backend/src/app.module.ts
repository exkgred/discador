import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  PASSWORD_HASHER,
  TOKEN_SERVICE,
} from './application/interfaces/auth.interfaces';
import { GetMeUseCase } from './application/use-cases/auth/get-me.use-case';
import { LoginUserUseCase } from './application/use-cases/auth/login-user.use-case';
import { LogoutUserUseCase } from './application/use-cases/auth/logout-user.use-case';
import { RefreshTokenUseCase } from './application/use-cases/auth/refresh-token.use-case';
import { RegisterUserUseCase } from './application/use-cases/auth/register-user.use-case';
import {
  GetWebphoneUseCase,
  HangupCallUseCase,
  ListCallsUseCase,
} from './application/use-cases/calls/calls.use-case';
import {
  CreateCampaignUseCase,
  EnqueueLeadsUseCase,
  GetCampaignUseCase,
  ListCampaignQueueUseCase,
  ListCampaignsUseCase,
  UpdateCampaignUseCase,
} from './application/use-cases/campaigns/campaigns.use-case';
import { CompleteWrapUpUseCase } from './application/use-cases/dialer/complete-wrap-up.use-case';
import {
  DialNextLeadUseCase,
  SetAgentReadyUseCase,
} from './application/use-cases/dialer/dial-next-lead.use-case';
import { WrapUpCallUseCase } from './application/use-cases/dialer/wrap-up-call.use-case';
import {
  AddDncUseCase,
  ListDncUseCase,
} from './application/use-cases/leads/dnc.use-case';
import {
  CreateLeadUseCase,
  GetLeadUseCase,
  ImportLeadsCsvUseCase,
  ListLeadsUseCase,
  UpdateLeadUseCase,
} from './application/use-cases/leads/leads.use-case';
import { HandleZenviaWebhookUseCase } from './application/use-cases/webhooks/handle-zenvia-webhook.use-case';
import {
  AGENT_SESSION_PORT,
  HANGUP_SCHEDULER,
  REALTIME_PUBLISHER,
} from './domain/ports/realtime.port';
import { ZENVIA_VOICE_PORT } from './domain/ports/zenvia-voice.port';
import { CALL_REPOSITORY } from './domain/repositories/call.repository';
import { CAMPAIGN_REPOSITORY } from './domain/repositories/campaign.repository';
import {
  CALLBACK_REPOSITORY,
  DNC_REPOSITORY,
} from './domain/repositories/dnc.repository';
import { LEAD_REPOSITORY } from './domain/repositories/lead.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { BcryptPasswordHasher } from './infrastructure/auth/bcrypt-password.hasher';
import { JwtAuthGuard } from './infrastructure/auth/jwt-auth.guard';
import { JwtTokenService } from './infrastructure/auth/jwt-token.service';
import { JwtStrategy } from './infrastructure/auth/jwt.strategy';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { InMemoryAgentSession } from './infrastructure/queue/in-memory-agent-session';
import { MockHangupScheduler } from './infrastructure/queue/mock-hangup.scheduler';
import { PrismaCallRepository } from './infrastructure/repositories/prisma-call.repository';
import { PrismaCampaignRepository } from './infrastructure/repositories/prisma-campaign.repository';
import {
  PrismaCallbackRepository,
  PrismaDncRepository,
} from './infrastructure/repositories/prisma-dnc.repository';
import { PrismaLeadRepository } from './infrastructure/repositories/prisma-lead.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { RealtimeGateway } from './infrastructure/websockets/realtime.gateway';
import { HttpZenviaVoiceAdapter } from './infrastructure/zenvia/http-zenvia-voice.adapter';
import { MockZenviaVoiceAdapter } from './infrastructure/zenvia/mock-zenvia-voice.adapter';
import { AuthController } from './presentation/controllers/auth.controller';
import { CampaignsController } from './presentation/controllers/campaigns.controller';
import { DialerController } from './presentation/controllers/dialer.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { LeadsController } from './presentation/controllers/leads.controller';
import { RolesGuard } from './presentation/guards/roles.guard';
import type { HangupScheduler } from './domain/ports/realtime.port';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    LeadsController,
    CampaignsController,
    DialerController,
  ],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    RolesGuard,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    { provide: LEAD_REPOSITORY, useClass: PrismaLeadRepository },
    { provide: CAMPAIGN_REPOSITORY, useClass: PrismaCampaignRepository },
    { provide: CALL_REPOSITORY, useClass: PrismaCallRepository },
    { provide: DNC_REPOSITORY, useClass: PrismaDncRepository },
    { provide: CALLBACK_REPOSITORY, useClass: PrismaCallbackRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: AGENT_SESSION_PORT, useClass: InMemoryAgentSession },
    RealtimeGateway,
    { provide: REALTIME_PUBLISHER, useExisting: RealtimeGateway },
    HandleZenviaWebhookUseCase,
    MockHangupScheduler,
    { provide: HANGUP_SCHEDULER, useExisting: MockHangupScheduler },
    {
      provide: ZENVIA_VOICE_PORT,
      inject: [ConfigService, HANGUP_SCHEDULER],
      useFactory: (config: ConfigService, hangups: HangupScheduler) => {
        const mode = config.get<string>('ZENVIA_MODE', 'mock');
        if (mode === 'http') {
          return new HttpZenviaVoiceAdapter(config);
        }
        return new MockZenviaVoiceAdapter(hangups, config);
      },
    },
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
    LogoutUserUseCase,
    GetMeUseCase,
    CreateLeadUseCase,
    UpdateLeadUseCase,
    ListLeadsUseCase,
    GetLeadUseCase,
    ImportLeadsCsvUseCase,
    AddDncUseCase,
    ListDncUseCase,
    CreateCampaignUseCase,
    UpdateCampaignUseCase,
    ListCampaignsUseCase,
    GetCampaignUseCase,
    EnqueueLeadsUseCase,
    ListCampaignQueueUseCase,
    SetAgentReadyUseCase,
    DialNextLeadUseCase,
    WrapUpCallUseCase,
    CompleteWrapUpUseCase,
    HangupCallUseCase,
    ListCallsUseCase,
    GetWebphoneUseCase,
  ],
})
export class AppModule {}
