import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
    HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { DealFeesService } from './deal-fees.service';
import { CreateDealFeeDto } from './dto/create-deal-fee.dto';
import { UpdateDealFeeDto } from './dto/update-deal-fee.dto';

@Controller('api/deals/:dealId/fees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SalesConsultant)
export class DealFeesController {
  constructor(private readonly dealFeesService: DealFeesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addFee(@Param('dealId') dealId: string, @Body() dto: CreateDealFeeDto) {
    return this.dealFeesService.addFee(dealId, dto);
  }

  @Patch(':feeId')
  async updateFee(
    @Param('dealId') dealId: string,
    @Param('feeId') feeId: string,
    @Body() dto: UpdateDealFeeDto,
  ) {
    return this.dealFeesService.updateFee(dealId, feeId, dto);
  }

  @Delete(':feeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFee(
    @Param('dealId') dealId: string,
    @Param('feeId') feeId: string,
  ) {
    return this.dealFeesService.removeFee(dealId, feeId);
  }
}
