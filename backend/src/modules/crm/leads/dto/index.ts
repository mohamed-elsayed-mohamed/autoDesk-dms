import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeadSource, LeadStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';
import { CreateCustomerDto } from '../../customers/dto';

export class CreateLeadDto {
  @ValidateIf((o: CreateLeadDto) => !o.customer)
  @IsUUID()
  customerId?: string;

  @ValidateIf((o: CreateLeadDto) => !o.customerId)
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer?: CreateCustomerDto;

  @IsEnum(LeadSource)
  source!: LeadSource;

  @ValidateIf((o: CreateLeadDto) => o.source === LeadSource.Other)
  @IsString()
  @MaxLength(100)
  sourceOther?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  vehicleIds?: string[];
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceOther?: string;
}

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status!: LeadStatus;

  @IsOptional()
  @IsString()
  lostReason?: string;
}

export class LeadFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class ReassignLeadDto {
  @IsUUID()
  assignedTo!: string;
}

export class AddVehicleDto {
  @IsUUID()
  vehicleId!: string;
}
