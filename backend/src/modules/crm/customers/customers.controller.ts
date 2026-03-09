import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CustomersService } from './customers.service';
import {
  CheckDuplicatesQueryDto,
  CreateCustomerDto,
  CustomerSearchQueryDto,
  UpdateCustomerDto,
} from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager)
@Controller('api/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get('check-duplicates')
  checkDuplicates(@Query() query: CheckDuplicatesQueryDto) {
    return this.customersService.checkDuplicates(query);
  }

  @Get()
  findAll(@Query() query: CustomerSearchQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Roles(UserRole.SalesManager)
  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.customersService.archive(id);
  }

  @Roles(UserRole.SalesManager)
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.customersService.restore(id);
  }
}
