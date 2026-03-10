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
import { TradeInService } from './trade-in.service';
import { UpsertTradeInDto } from './dto/upsert-trade-in.dto';

@Controller('api/deals/:dealId/trade-in')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SalesConsultant)
export class TradeInController {
  constructor(private readonly tradeInService: TradeInService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upsertTradeIn(
    @Param('dealId') dealId: string,
    @Body() dto: UpsertTradeInDto,
  ) {
    return this.tradeInService.upsertTradeIn(dealId, dto);
  }

  @Patch()
  async updateTradeIn(
    @Param('dealId') dealId: string,
    @Body() dto: UpsertTradeInDto,
  ) {
    return this.tradeInService.updateTradeIn(dealId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTradeIn(@Param('dealId') dealId: string) {
    return this.tradeInService.removeTradeIn(dealId);
  }
}
