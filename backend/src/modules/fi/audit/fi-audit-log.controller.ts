import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { FiAuditService } from './fi-audit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Controller('api/deals/:dealId/fi-audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FniManager, UserRole.SalesManager, UserRole.Controller)
export class FiAuditLogController {
  constructor(
    private readonly auditService: FiAuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async findByDeal(
    @Param('dealId') dealId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 25;
    return this.auditService.findByDeal(dealId, pageNum, limitNum, this.prisma);
  }
}
