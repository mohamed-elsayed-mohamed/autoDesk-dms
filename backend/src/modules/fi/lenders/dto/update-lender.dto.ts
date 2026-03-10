import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLenderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxMarkupCap?: number;
}
