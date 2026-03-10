import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FiProductType } from '@prisma/client';

export class UpsertCatalogItemDto {
  @IsEnum(FiProductType)
  productType!: FiProductType;

  @IsString()
  @IsNotEmpty()
  providerName!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
