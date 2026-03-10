import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { HousingType } from '@prisma/client';

export class UpsertCreditApplicationDto {
  @IsNumber()
  @Min(0)
  annualIncome!: number;

  @IsString()
  @IsNotEmpty()
  employerName!: string;

  @IsInt()
  @Min(0)
  employmentLengthMonths!: number;

  @IsEnum(HousingType)
  housingType!: HousingType;

  @IsNumber()
  @Min(0)
  monthlyHousingPayment!: number;

  @IsString()
  @IsNotEmpty()
  ssn!: string;

  @IsISO8601()
  dateOfBirth!: string;

  @IsOptional()
  supersede?: boolean = false;
}
