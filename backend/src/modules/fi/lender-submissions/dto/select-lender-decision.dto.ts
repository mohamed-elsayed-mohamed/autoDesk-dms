import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class SelectLenderDecisionDto {
  @IsString()
  lenderSubmissionId!: string;

  @IsNumber()
  @Min(0)
  rateMarkup!: number;

  @IsInt()
  @Min(1)
  selectedTerm!: number;
}
