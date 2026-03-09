import { Controller, Post, Param, Body, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DealStatusService } from './deal-status.service';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { RequestingUser } from './deals.service';

@Controller('api/deals/:id/status')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DealStatusController {
  constructor(private readonly dealStatusService: DealStatusService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async transitionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionStatusDto,
    @CurrentUser() actor: RequestingUser,
  ) {
    await this.dealStatusService.transitionStatus(id, dto, actor);
    return { message: 'Status updated successfully.' };
  }
}
