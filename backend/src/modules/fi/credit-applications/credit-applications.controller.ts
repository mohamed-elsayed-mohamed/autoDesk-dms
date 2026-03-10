import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreditApplicationsService, Actor } from './credit-applications.service';
import { UpsertCreditApplicationDto } from './dto/upsert-credit-application.dto';
import { UpdateCreditApplicationDto } from './dto/update-credit-application.dto';

@Controller('api/deals/:dealId/credit-application')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditApplicationsController {
  constructor(private readonly service: CreditApplicationsService) {}

  @Get()
  @Roles(UserRole.FniManager, UserRole.SalesManager, UserRole.Controller)
  async findOne(@Param('dealId') dealId: string) {
    const app = await this.service.findByDealId(dealId);
    if (!app) throw new NotFoundException('No active credit application found for this deal');
    return app;
  }

  @Post()
  @Roles(UserRole.FniManager)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('dealId') dealId: string,
    @Body() dto: UpsertCreditApplicationDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.createOrSupersede(dealId, dto, actor);
  }

  @Patch()
  @Roles(UserRole.FniManager)
  async update(
    @Param('dealId') dealId: string,
    @Body() dto: UpdateCreditApplicationDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.updateDraft(dealId, dto, actor);
  }

  @Post('submit')
  @Roles(UserRole.FniManager)
  @HttpCode(HttpStatus.OK)
  async submit(@Param('dealId') dealId: string, @CurrentUser() actor: Actor) {
    return this.service.submit(dealId, actor);
  }
}
