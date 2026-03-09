import { Module } from '@nestjs/common';
import { DealsRepository } from './deals.repository';
import { DealCalculationService } from './calculation/deal-calculation.service';
import { DealsService } from './deals.service';
import { DealFeesService } from './deal-fees.service';
import { TradeInService } from './trade-in.service';
import { DealStatusService } from './deal-status.service';
import { DealDocumentsService } from './deal-documents.service';
import { SalesReportService } from './reports/sales-report.service';
import { DealsController } from './deals.controller';
import { DealFeesController } from './deal-fees.controller';
import { TradeInController } from './trade-in.controller';
import { DealStatusController } from './deal-status.controller';
import { DealDocumentsController } from './deal-documents.controller';
import { SalesReportController } from './reports/sales-report.controller';

@Module({
  controllers: [
    DealsController,
    DealFeesController,
    TradeInController,
    DealStatusController,
    DealDocumentsController,
    SalesReportController,
  ],
  providers: [
    DealsRepository,
    DealCalculationService,
    DealsService,
    DealFeesService,
    TradeInService,
    DealStatusService,
    DealDocumentsService,
    SalesReportService,
  ],
  exports: [DealsRepository, DealCalculationService, DealsService],
})
export class DealsModule {}
