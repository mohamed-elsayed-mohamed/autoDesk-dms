import { IsArray, IsString } from 'class-validator';

export class PhotoReorderDto {
  @IsArray()
  @IsString({ each: true })
  order!: string[];
}
