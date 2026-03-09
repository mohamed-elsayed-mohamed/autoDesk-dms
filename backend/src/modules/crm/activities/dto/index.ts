import { IsEnum, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { ActivityDirection, ActivityType } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

const DIRECTION_REQUIRED_TYPES: ActivityType[] = [
  ActivityType.Call,
  ActivityType.Email,
  ActivityType.Text,
  ActivityType.Visit,
];

export class CreateActivityDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsEnum(ActivityType)
  type!: ActivityType;

  @ValidateIf((o: CreateActivityDto) => DIRECTION_REQUIRED_TYPES.includes(o.type))
  @IsEnum(ActivityDirection)
  direction?: ActivityDirection;

  @IsOptional()
  @IsString()
  content?: string;
}

export class TimelineQueryDto extends PaginationQueryDto {}
