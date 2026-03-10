import {
  Body,
  Controller,
  Get,
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
import { LenderSubmissionsService } from './lender-submissions.service';
import { SubmitToLendersDto } from './dto/submit-to-lenders.dto';
import { SelectLenderDecisionDto } from './dto/select-lender-decision.dto';
import { Actor } from '../credit-applications/credit-applications.service';

@Controller('api/deals/:dealId/lender-submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LenderSubmissionsController {
  constructor(private readonly service: LenderSubmissionsService) {}

  @Get()
  @Roles(UserRole.FniManager, UserRole.SalesManager, UserRole.Controller)
  async findAll(@Param('dealId') dealId: string) {
    return this.service.findByDealId(dealId);
  }

  @Post()
  @Roles(UserRole.FniManager)
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Param('dealId') dealId: string,
    @Body() dto: SubmitToLendersDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.submitToLenders(dealId, dto, actor);
  }

  @Post('select')
  @Roles(UserRole.FniManager)
  @HttpCode(HttpStatus.OK)
  async selectDecision(
    @Param('dealId') dealId: string,
    @Body() dto: SelectLenderDecisionDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.selectDecision(dealId, dto, actor);
  }
}
