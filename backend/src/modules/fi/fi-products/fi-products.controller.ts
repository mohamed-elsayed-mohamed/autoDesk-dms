import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
    Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { FiProductsService } from './fi-products.service';
import { CreateFiProductDto } from './dto/create-fi-product.dto';
import { UpdateFiProductDto } from './dto/update-fi-product.dto';
import { Actor } from '../credit-applications/credit-applications.service';

@Controller('api/deals/:dealId/fi-products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FiProductsController {
  constructor(private readonly service: FiProductsService) {}

  @Get()
  @Roles(UserRole.FniManager, UserRole.SalesManager, UserRole.Controller)
  async findAll(@Param('dealId') dealId: string) {
    return this.service.findByDealId(dealId);
  }

  @Post()
  @Roles(UserRole.FniManager)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('dealId') dealId: string,
    @Body() dto: CreateFiProductDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.addProduct(dealId, dto, actor);
  }

  @Patch(':productId')
  @Roles(UserRole.FniManager)
  async update(
    @Param('dealId') dealId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateFiProductDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.editProduct(dealId, productId, dto, actor);
  }

  @Delete(':productId')
  @Roles(UserRole.FniManager)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('dealId') dealId: string,
    @Param('productId') productId: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.removeProduct(dealId, productId, actor);
  }
}
