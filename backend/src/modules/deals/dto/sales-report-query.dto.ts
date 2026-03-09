import { IsDateString } from 'class-validator';

export class SalesReportQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
