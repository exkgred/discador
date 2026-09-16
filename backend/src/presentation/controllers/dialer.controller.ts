import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { AccessTokenPayload } from '../../application/interfaces/auth.interfaces';
import {
  GetWebphoneUseCase,
  HangupCallUseCase,
  ListCallsUseCase,
} from '../../application/use-cases/calls/calls.use-case';
import { CompleteWrapUpUseCase } from '../../application/use-cases/dialer/complete-wrap-up.use-case';
import {
  DialNextLeadUseCase,
  SetAgentReadyUseCase,
} from '../../application/use-cases/dialer/dial-next-lead.use-case';
import { HandleZenviaWebhookUseCase } from '../../application/use-cases/webhooks/handle-zenvia-webhook.use-case';
import { UnauthorizedError } from '../../domain/errors/domain-error';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import {
  AgentReadyDto,
  DialDto,
  PaginationQueryDto,
  WrapUpDto,
} from '../dto/discador.dto';
import { RolesGuard } from '../guards/roles.guard';

@ApiTags('Discador')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DialerController {
  constructor(
    private readonly ready: SetAgentReadyUseCase,
    private readonly dialNext: DialNextLeadUseCase,
    private readonly wrapUp: CompleteWrapUpUseCase,
    private readonly hangup: HangupCallUseCase,
    private readonly listCalls: ListCallsUseCase,
    private readonly webphone: GetWebphoneUseCase,
    private readonly webhook: HandleZenviaWebhookUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('agent/ready')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agente disponível em uma campanha' })
  setReady(
    @Body() dto: AgentReadyDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.ready.execute({ userId: user.sub, campaignId: dto.campaignId });
  }

  @Post('agent/dial')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Discar próximo lead ou lead específico' })
  dial(@Body() dto: DialDto, @CurrentUser() user: AccessTokenPayload) {
    return this.dialNext.execute({
      agentId: user.sub,
      campaignId: dto.campaignId,
      campaignLeadId: dto.campaignLeadId,
    });
  }

  @Post('calls/:id/hangup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerrar chamada na Zenvia' })
  hang(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.hangup.execute(id, user.sub);
  }

  @Post('calls/:id/wrap-up')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Registrar resultado; no modo POWER disca o próximo',
  })
  complete(
    @Param('id') id: string,
    @Body() dto: WrapUpDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.wrapUp.execute({
      callId: id,
      agentId: user.sub,
      ...dto,
    });
  }

  @Get('calls')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico de chamadas' })
  history(
    @Query() query: PaginationQueryDto,
    @Query('campaignId') campaignId: string | undefined,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const agentId = user.role === 'AGENT' ? user.sub : undefined;
    return this.listCalls.execute({
      campaignId,
      agentId,
      page: query.page,
      perPage: query.perPage,
    });
  }

  @Get('webphone')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'URL do webphone hidden (token não vai ao browser)',
  })
  getWebphone(@CurrentUser() user: AccessTokenPayload) {
    return this.webphone.execute(user.sub);
  }

  @Public()
  @Post('webhooks/zenvia')
  @ApiOperation({ summary: 'Webhook Chamada-Fim da API de Voz' })
  handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-secret') secret: string | undefined,
  ) {
    const expected = this.config.get<string>('ZENVIA_WEBHOOK_SECRET');
    if (expected && secret !== expected) {
      throw new UnauthorizedError('Webhook não autorizado');
    }
    const id = body.id ?? (body.dados as { id?: unknown } | undefined)?.id;
    if (id === undefined || id === null) {
      return { ignored: true };
    }
    return this.webhook.execute({
      ...body,
      id: id as string | number,
    });
  }
}
