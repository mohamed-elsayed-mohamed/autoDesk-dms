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
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import {
  AddVehicleDto,
  CreateLeadDto,
  LeadFilterQueryDto,
  ReassignLeadDto,
  UpdateLeadDto,
  UpdateLeadStatusDto,
} from './dto';

interface AuthUser {
  id: string;
  role: UserRole;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager)
@Controller('api/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Get()
  findAll(@Query() query: LeadFilterQueryDto) {
    return this.leadsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leadsService.updateStatus(id, dto, user.id);
  }

  @Post(':id/vehicles')
  addVehicle(@Param('id') id: string, @Body() dto: AddVehicleDto) {
    return this.leadsService.addVehicle(id, dto);
  }

  @Delete(':id/vehicles/:vehicleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVehicle(@Param('id') id: string, @Param('vehicleId') vehicleId: string) {
    return this.leadsService.removeVehicle(id, vehicleId);
  }

  @Roles(UserRole.SalesManager)
  @Patch(':id/reassign')
  reassign(@Param('id') id: string, @Body() dto: ReassignLeadDto) {
    return this.leadsService.reassign(id, dto.assignedTo);
  }
}
