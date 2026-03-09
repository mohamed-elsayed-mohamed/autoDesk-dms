import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SalesReportService } from './sales-report.service';
import { SalesReportQueryDto } from '../dto/sales-report-query.dto';
import { StreamableFile } from '@nestjs/common';

@Controller('api/reports/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SalesManager, UserRole.GeneralManager)
export class SalesReportController {
  constructor(private readonly salesReportService: SalesReportService) {}

  @Get()
  async getReport(@Query() dto: SalesReportQueryDto) {
    return this.salesReportService.aggregateReport(dto);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="sales-report.csv"')
  async exportCsv(
    @Query() dto: SalesReportQueryDto,
    @Res({ passthrough: true }) _res: Response,
  ) {
    const buffer = await this.salesReportService.generateCsv(dto);
    return new StreamableFile(buffer);
  }
}
