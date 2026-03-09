import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { PreferredContact } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\d\s\-().+]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, { message: 'zip must be 5 or 9 digits' })
  zip?: string;

  @IsOptional()
  @IsEnum(PreferredContact)
  preferredContact?: PreferredContact;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsString()
  updatedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\d\s\-().+]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, { message: 'zip must be 5 or 9 digits' })
  zip?: string;

  @IsOptional()
  @IsEnum(PreferredContact)
  preferredContact?: PreferredContact;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CustomerSearchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  includeArchived?: boolean = false;
}

export class CheckDuplicatesQueryDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  excludeId?: string;
}
