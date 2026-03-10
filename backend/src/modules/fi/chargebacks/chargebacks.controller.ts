import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
    Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ChargebacksService } from './chargebacks.service';
import { RecordChargebackDto } from './dto/record-chargeback.dto';
import { Actor } from '../credit-applications/credit-applications.service';

@Controller('api/deals/:dealId/fi-products/:productId/chargeback')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChargebacksController {
  constructor(private readonly service: ChargebacksService) {}

  @Post()
  @Roles(UserRole.FniManager, UserRole.Controller)
  @HttpCode(HttpStatus.OK)
  async record(
    @Param('dealId') dealId: string,
    @Param('productId') productId: string,
    @Body() dto: RecordChargebackDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.recordChargeback(dealId, productId, dto, actor);
  }
}
