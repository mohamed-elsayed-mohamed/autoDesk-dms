import { IsOptional, IsNumber, IsEnum, IsDateString, Min, IsInt } from 'class-validator';
import { DealType } from '@prisma/client';

export class UpdateDealDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rebates?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  apr?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  term?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  backEndGross?: number | null;

  @IsOptional()
  @IsEnum(DealType)
  dealType?: DealType;

  @IsDateString()
  updatedAt!: string; // Required for optimistic concurrency check
}
