import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class SubmitToLendersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  lenderIds!: string[];
}
