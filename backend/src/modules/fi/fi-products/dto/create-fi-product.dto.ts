import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FiProductType } from '@prisma/client';

export class CreateFiProductDto {
  @IsEnum(FiProductType)
  productType!: FiProductType;

  @IsString()
  @IsNotEmpty()
  providerName!: string;

  @IsNumber()
  @Min(0)
  cost!: number;

  @IsNumber()
  @Min(0)
  sellingPrice!: number;

  @IsInt()
  @Min(1)
  termMonths!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductible?: number;

  @IsOptional()
  @IsString()
  contractNumber?: string;
}
