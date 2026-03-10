import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PerformanceReportService } from './performance-report.service';
import { StreamableFile } from '@nestjs/common';

@Controller('api/fi/performance-report')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FniManager, UserRole.Controller)
export class PerformanceReportController {
  constructor(private readonly service: PerformanceReportService) {}

  @Get()
  async getReport(@Query('from') from: string, @Query('to') to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.service.getReport(fromDate, toDate);
  }

  @Get('export')
  async exportCsv(
    @Query('from') from: string,
    @Query('to') to: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const stream = await this.service.generateCsv(fromDate, toDate);

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="fi-performance-${from}-${to}.csv"`,
    });

    return new StreamableFile(stream);
  }
}
