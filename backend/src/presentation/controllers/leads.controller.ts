import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateLeadUseCase,
  GetLeadUseCase,
  ImportLeadsCsvUseCase,
  ListLeadsUseCase,
  UpdateLeadUseCase,
} from '../../application/use-cases/leads/leads.use-case';
import {
  AddDncUseCase,
  ListDncUseCase,
} from '../../application/use-cases/leads/dnc.use-case';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import {
  AddDncDto,
  CreateLeadDto,
  ImportCsvDto,
  PaginationQueryDto,
  UpdateLeadDto,
} from '../dto/discador.dto';
import { RolesGuard } from '../guards/roles.guard';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(
    private readonly createLead: CreateLeadUseCase,
    private readonly updateLead: UpdateLeadUseCase,
    private readonly listLeads: ListLeadsUseCase,
    private readonly getLead: GetLeadUseCase,
    private readonly importCsv: ImportLeadsCsvUseCase,
    private readonly addDnc: AddDncUseCase,
    private readonly listDnc: ListDncUseCase,
  ) {}

  @Get('leads')
  @ApiOperation({ summary: 'Listar leads' })
  list(@Query() query: PaginationQueryDto) {
    return this.listLeads.execute(query);
  }

  @Post('leads')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Criar lead' })
  create(@Body() dto: CreateLeadDto) {
    return this.createLead.execute(dto);
  }

  @Post('leads/import')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Importar CSV name,phone,company,city,segment,activity,tags' })
  import(@Body() dto: ImportCsvDto) {
    return this.importCsv.execute(dto.csv);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Obter lead' })
  get(@Param('id') id: string) {
    return this.getLead.execute(id);
  }

  @Patch('leads/:id')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Atualizar lead' })
  patch(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.updateLead.execute({ id, ...dto });
  }

  @Get('dnc')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Lista Não Me Perturbe' })
  dnc() {
    return this.listDnc.execute();
  }

  @Post('dnc')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Adicionar telefone à DNC' })
  addToDnc(@Body() dto: AddDncDto) {
    return this.addDnc.execute(dto);
  }
}
