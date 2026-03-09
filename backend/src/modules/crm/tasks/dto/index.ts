import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TaskStatus, TaskType } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class CreateTaskDto {
  @IsUUID()
  leadId!: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsDateString()
  dueAt!: string;
}

export class UpdateTaskStatusDto {
  @IsIn(['Completed', 'Cancelled'])
  status!: 'Completed' | 'Cancelled';
}

export class ReassignTaskDto {
  @IsUUID()
  assignedTo!: string;
}

export class TaskFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class LeadTaskFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
