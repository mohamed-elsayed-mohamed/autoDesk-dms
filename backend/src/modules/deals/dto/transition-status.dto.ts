import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DealStatus } from '@prisma/client';

export class TransitionStatusDto {
  @IsEnum(DealStatus)
  newStatus!: DealStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
