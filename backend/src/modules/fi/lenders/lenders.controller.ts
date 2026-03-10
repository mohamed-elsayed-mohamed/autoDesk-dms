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
import { LendersService } from './lenders.service';
import { CreateLenderDto } from './dto/create-lender.dto';
import { UpdateLenderDto } from './dto/update-lender.dto';

@Controller('api/fi/lenders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LendersController {
  constructor(private readonly service: LendersService) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findActiveById(id);
  }

  @Post()
  @Roles(UserRole.Administrator)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLenderDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.Administrator)
  async update(@Param('id') id: string, @Body() dto: UpdateLenderDto) {
    return this.service.update(id, dto);
  }
}
