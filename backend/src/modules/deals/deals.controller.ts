import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
    HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, DealStatus } from '@prisma/client';
import { DealsService, RequestingUser } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { IsOptional, IsString, IsNumberString, IsEnum } from 'class-validator';

class DealListQueryDto {
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  pageSize?: number;
}

@Controller('api/deals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @Roles(UserRole.SalesConsultant)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDealDto, @CurrentUser() actor: RequestingUser) {
    return this.dealsService.createDeal(dto, actor);
  }

  @Get()
  async findAll(@Query() query: DealListQueryDto, @CurrentUser() actor: RequestingUser) {
    return this.dealsService.findAll(actor, {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.dealsService.findOneOrFail(id);
  }

  @Patch(':id')
  @Roles(UserRole.SalesConsultant)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser() actor: RequestingUser,
  ) {
    return this.dealsService.updateDesking(id, dto, actor);
  }
}
