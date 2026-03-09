import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { IsNumber, IsInt, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { DealershipConfigService } from './config.service';

class UpdateDealNumberOffsetDto {
  @IsNumber()
  @IsInt()
  @Min(1)
  dealNumberOffset!: number;
}

@Controller('api/config/dealership')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DealershipConfigController {
  constructor(private readonly configService: DealershipConfigService) {}

  @Get()
  @Roles(UserRole.GeneralManager, UserRole.SalesManager)
  async getConfig() {
    return this.configService.getConfig();
  }

  @Patch()
  @Roles(UserRole.GeneralManager)
  async updateOffset(@Body() dto: UpdateDealNumberOffsetDto) {
    return this.configService.updateDealNumberOffset(dto.dealNumberOffset);
  }
}
