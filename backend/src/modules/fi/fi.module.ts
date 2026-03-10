import { Module } from '@nestjs/common';
import { LendersController } from './lenders/lenders.controller';
import { LendersService } from './lenders/lenders.service';
import { LendersRepository } from './lenders/lenders.repository';
import { SsnEncryptionService } from './calculation/ssn-encryption.service';
import { FiCalculationService } from './calculation/fi-calculation.service';
import { LenderSimulatorService } from './lender-submissions/lender-simulator.service';
import { FiAuditService } from './audit/fi-audit.service';
import { CreditApplicationsController } from './credit-applications/credit-applications.controller';
import { CreditApplicationsService } from './credit-applications/credit-applications.service';
import { CreditApplicationsRepository } from './credit-applications/credit-applications.repository';
import { LenderSubmissionsController } from './lender-submissions/lender-submissions.controller';
import { LenderSubmissionsService } from './lender-submissions/lender-submissions.service';
import { LenderSubmissionsRepository } from './lender-submissions/lender-submissions.repository';
import { ProductCatalogController } from './product-catalog/product-catalog.controller';
import { ProductCatalogService } from './product-catalog/product-catalog.service';
import { FiProductsController } from './fi-products/fi-products.controller';
import { FiProductsService } from './fi-products/fi-products.service';
import { FiProductsRepository } from './fi-products/fi-products.repository';
import { ChargebacksController } from './chargebacks/chargebacks.controller';
import { ChargebacksService } from './chargebacks/chargebacks.service';
import { PerformanceReportController } from './performance-report/performance-report.controller';
import { PerformanceReportService } from './performance-report/performance-report.service';
import { DisclosuresController } from './disclosures/disclosures.controller';
import { DisclosuresService } from './disclosures/disclosures.service';
import { FiAuditLogController } from './audit/fi-audit-log.controller';

@Module({
  controllers: [
    LendersController,
    CreditApplicationsController,
    LenderSubmissionsController,
    ProductCatalogController,
    FiProductsController,
    ChargebacksController,
    PerformanceReportController,
    DisclosuresController,
    FiAuditLogController,
  ],
  providers: [
    // Pure services (no DB dependency)
    SsnEncryptionService,
    FiCalculationService,
    LenderSimulatorService,
    FiAuditService,
    // Repositories
    LendersRepository,
    CreditApplicationsRepository,
    LenderSubmissionsRepository,
    FiProductsRepository,
    // Domain services
    LendersService,
    CreditApplicationsService,
    LenderSubmissionsService,
    ProductCatalogService,
    FiProductsService,
    ChargebacksService,
    PerformanceReportService,
    DisclosuresService,
  ],
})
export class FiModule {}
