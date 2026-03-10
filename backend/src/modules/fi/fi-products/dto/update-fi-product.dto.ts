import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FiProductType } from '@prisma/client';

export class UpdateFiProductDto {
  @IsOptional()
  @IsEnum(FiProductType)
  productType?: FiProductType;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  termMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductible?: number;

  @IsOptional()
  @IsString()
  contractNumber?: string;
}
