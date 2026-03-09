import { IsOptional, IsString, IsNumber, IsBoolean, Min, IsNotEmpty } from 'class-validator';

export class UpdateDealFeeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;
}
