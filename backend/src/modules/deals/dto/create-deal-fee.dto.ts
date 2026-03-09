import { IsString, IsNumber, IsBoolean, Min, IsNotEmpty } from 'class-validator';

export class CreateDealFeeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsBoolean()
  taxable!: boolean;
}
