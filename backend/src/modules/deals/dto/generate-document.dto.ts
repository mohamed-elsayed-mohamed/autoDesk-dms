import { IsEnum } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class GenerateDocumentDto {
  @IsEnum(DocumentType)
  documentType!: DocumentType;
}
