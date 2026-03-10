import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmDisclosureDto {
  @IsString()
  @IsNotEmpty()
  disclosureRequirementId!: string;
}
