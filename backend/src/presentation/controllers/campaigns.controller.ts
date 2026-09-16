import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateCampaignUseCase,
  EnqueueLeadsUseCase,
  GetCampaignUseCase,
  ListCampaignQueueUseCase,
  ListCampaignsUseCase,
  UpdateCampaignUseCase,
} from '../../application/use-cases/campaigns/campaigns.use-case';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import {
  CreateCampaignDto,
  EnqueueLeadsDto,
  UpdateCampaignDto,
} from '../dto/discador.dto';
import { RolesGuard } from '../guards/roles.guard';

@ApiTags('Campanhas')
@ApiBearerAuth()
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(
    private readonly createCampaign: CreateCampaignUseCase,
    private readonly updateCampaign: UpdateCampaignUseCase,
    private readonly listCampaigns: ListCampaignsUseCase,
    private readonly getCampaign: GetCampaignUseCase,
    private readonly enqueueLeads: EnqueueLeadsUseCase,
    private readonly listQueue: ListCampaignQueueUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar campanhas' })
  list() {
    return this.listCampaigns.execute();
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Criar campanha' })
  create(@Body() dto: CreateCampaignDto) {
    return this.createCampaign.execute(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter campanha' })
  get(@Param('id') id: string) {
    return this.getCampaign.execute(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Atualizar campanha' })
  patch(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.updateCampaign.execute(id, dto);
  }

  @Get(':id/queue')
  @ApiOperation({ summary: 'Fila da campanha' })
  queue(@Param('id') id: string) {
    return this.listQueue.execute(id);
  }

  @Post(':id/queue')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Enfileirar leads' })
  enqueue(@Param('id') id: string, @Body() dto: EnqueueLeadsDto) {
    return this.enqueueLeads.execute(id, dto.leadIds);
  }
}
