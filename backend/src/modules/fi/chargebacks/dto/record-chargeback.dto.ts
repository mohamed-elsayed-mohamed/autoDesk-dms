import { IsISO8601, IsNumber, Min } from 'class-validator';

export class RecordChargebackDto {
  @IsNumber()
  @Min(0)
  chargebackAmount!: number;

  @IsISO8601()
  chargebackDate!: string;
}
