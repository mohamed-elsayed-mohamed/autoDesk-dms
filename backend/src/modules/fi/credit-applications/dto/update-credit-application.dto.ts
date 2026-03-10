import { IsEnum, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { HousingType } from '@prisma/client';

export class UpdateCreditApplicationDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualIncome?: number;

  @IsOptional()
  @IsString()
  employerName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  employmentLengthMonths?: number;

  @IsOptional()
  @IsEnum(HousingType)
  housingType?: HousingType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyHousingPayment?: number;

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;
}
