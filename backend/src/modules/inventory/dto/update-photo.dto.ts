import { IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class UpdatePhotoDto {
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
