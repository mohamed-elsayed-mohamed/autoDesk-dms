import { IsString, IsEnum, IsUUID } from 'class-validator';
import { DealType } from '@prisma/client';

export class CreateDealDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsEnum(DealType)
  dealType!: DealType;
}
