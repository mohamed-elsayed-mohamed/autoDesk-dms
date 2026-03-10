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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DisclosuresService } from './disclosures.service';
import { ConfirmDisclosureDto } from './dto/confirm-disclosure.dto';
import { UpsertDisclosureRequirementDto } from './dto/upsert-disclosure-requirement.dto';
import { Actor } from '../credit-applications/credit-applications.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisclosuresController {
  constructor(private readonly service: DisclosuresService) {}

  @Get('api/fi/disclosure-requirements')
  async getRequirements(@Query('jurisdiction') jurisdiction?: string) {
    return this.service.getRequirements(jurisdiction);
  }

  @Get('api/deals/:dealId/disclosures')
  @Roles(UserRole.FniManager, UserRole.SalesManager, UserRole.Controller)
  async getConfirmations(@Param('dealId') dealId: string) {
    return this.service.getConfirmations(dealId);
  }

  @Post('api/deals/:dealId/disclosures/confirm')
  @Roles(UserRole.FniManager)
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('dealId') dealId: string,
    @Body() dto: ConfirmDisclosureDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.confirmDisclosure(dealId, dto, actor);
  }

  @Post('api/fi/disclosure-requirements')
  @Roles(UserRole.Administrator)
  @HttpCode(HttpStatus.CREATED)
  async createRequirement(@Body() dto: UpsertDisclosureRequirementDto) {
    return this.service.createRequirement(dto);
  }

  @Patch('api/fi/disclosure-requirements/:id')
  @Roles(UserRole.Administrator)
  async updateRequirement(
    @Param('id') id: string,
    @Body() dto: Partial<UpsertDisclosureRequirementDto>,
  ) {
    return this.service.updateRequirement(id, dto);
  }
}
