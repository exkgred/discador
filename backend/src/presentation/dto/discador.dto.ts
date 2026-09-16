import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { DialMode } from '../../domain/entities/campaign.entity';
import type { CallDisposition } from '../../domain/entities/call.entity';

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '11999999999' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportCsvDto {
  @ApiProperty({ description: 'CSV: name,phone,tags' })
  @IsString()
  csv!: string;
}

export class PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perPage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsString()
  script!: string;

  @ApiPropertyOptional({ enum: ['MANUAL', 'POWER'] })
  @IsOptional()
  @IsEnum(['MANUAL', 'POWER'])
  dialMode?: DialMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gravarAudio?: boolean;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  windowStart?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  windowEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeZone?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  script?: string;

  @ApiPropertyOptional({ enum: ['MANUAL', 'POWER'] })
  @IsOptional()
  @IsEnum(['MANUAL', 'POWER'])
  dialMode?: DialMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gravarAudio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  windowStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  windowEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class EnqueueLeadsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  leadIds!: string[];
}

export class AgentReadyDto {
  @ApiProperty()
  @IsString()
  campaignId!: string;
}

export class DialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignLeadId?: string;
}

export class WrapUpDto {
  @ApiProperty({
    enum: [
      'ANSWERED',
      'NO_ANSWER',
      'VOICEMAIL',
      'BUSY',
      'CALLBACK',
      'DNC',
      'OTHER',
    ],
  })
  @IsEnum([
    'ANSWERED',
    'NO_ANSWER',
    'VOICEMAIL',
    'BUSY',
    'CALLBACK',
    'DNC',
    'OTHER',
  ])
  disposition!: CallDisposition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callbackAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoDialNext?: boolean;
}

export class AddDncDto {
  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
