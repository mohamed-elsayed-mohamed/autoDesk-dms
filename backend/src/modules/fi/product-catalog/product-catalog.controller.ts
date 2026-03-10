import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
    Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ProductCatalogService } from './product-catalog.service';
import { UpsertCatalogItemDto } from './dto/upsert-catalog-item.dto';

@Controller('api/fi/product-catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductCatalogController {
  constructor(private readonly service: ProductCatalogService) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Post()
  @Roles(UserRole.Administrator)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: UpsertCatalogItemDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.Administrator)
  async update(@Param('id') id: string, @Body() dto: Partial<UpsertCatalogItemDto>) {
    return this.service.update(id, dto);
  }
}
