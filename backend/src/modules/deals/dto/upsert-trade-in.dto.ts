import { IsOptional, IsString, IsInt, IsNumber, IsEnum, Min, Length } from 'class-validator';
import { TradeInCondition } from '@prisma/client';

export class UpsertTradeInDto {
  @IsOptional()
  @IsString()
  @Length(17, 17)
  vin?: string;

  @IsInt()
  @Min(1900)
  year!: number;

  @IsString()
  make!: string;

  @IsString()
  model!: string;

  @IsInt()
  @Min(0)
  mileage!: number;

  @IsEnum(TradeInCondition)
  condition!: TradeInCondition;

  @IsNumber()
  @Min(0)
  acv!: number;

  @IsNumber()
  @Min(0)
  allowance!: number;

  @IsNumber()
  @Min(0)
  payoff!: number;

  @IsOptional()
  @IsString()
  lenderName?: string;
}
