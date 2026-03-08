import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsNumber,
  Length,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Condition, VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @IsString()
  @Length(17, 17)
  vin!: string;

  @IsInt()
  @Min(1900)
  year!: number;

  @IsString()
  make!: string;

  @IsString()
  model!: string;

  @IsOptional()
  @IsString()
  trim?: string;

  @IsOptional()
  @IsString()
  bodyStyle?: string;

  @IsOptional()
  @IsString()
  exteriorColor?: string;

  @IsOptional()
  @IsString()
  interiorColor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsEnum(Condition)
  condition!: Condition;

  @IsEnum(VehicleStatus)
  status!: VehicleStatus;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  msrp?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  invoicePrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  internetPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  salePrice?: number;

  @IsOptional()
  @IsString()
  lotLocation?: string;

  @IsOptional()
  @IsDateString()
  dateAcquired?: string;
}
