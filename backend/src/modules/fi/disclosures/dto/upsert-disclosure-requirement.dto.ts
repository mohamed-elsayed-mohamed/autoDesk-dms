import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertDisclosureRequirementDto {
  @IsString()
  @IsNotEmpty()
  jurisdiction!: string;

  @IsString()
  @IsNotEmpty()
  disclosureName!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
