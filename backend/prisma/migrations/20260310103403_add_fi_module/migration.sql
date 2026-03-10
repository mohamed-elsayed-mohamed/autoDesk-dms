-- CreateEnum
CREATE TYPE "HousingType" AS ENUM ('Own', 'Rent', 'Other');

-- CreateEnum
CREATE TYPE "CreditApplicationStatus" AS ENUM ('Draft', 'Submitted', 'Archived');

-- CreateEnum
CREATE TYPE "LenderDecision" AS ENUM ('Approved', 'Conditional', 'Declined');

-- CreateEnum
CREATE TYPE "FiProductType" AS ENUM ('VSC', 'GAP', 'TireWheel', 'PaintProtection', 'MaintenancePlan', 'Other');

-- CreateEnum
CREATE TYPE "FiProductStatus" AS ENUM ('Active', 'Cancelled', 'ChargedBack');

-- CreateEnum
CREATE TYPE "FiAuditActionType" AS ENUM ('CreditAppCreated', 'CreditAppSubmitted', 'CreditAppSuperseded', 'LenderSubmitted', 'LenderDecisionSelected', 'ProductAdded', 'ProductEdited', 'ProductRemoved', 'ProductStatusChanged', 'ChargebackRecorded', 'DisclosureConfirmed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'Controller';
ALTER TYPE "UserRole" ADD VALUE 'Administrator';

-- DropForeignKey
ALTER TABLE "deal_fees" DROP CONSTRAINT "deal_fees_dealId_fkey";

-- DropForeignKey
ALTER TABLE "deal_status_history" DROP CONSTRAINT "deal_status_history_actorId_fkey";

-- DropForeignKey
ALTER TABLE "trade_ins" DROP CONSTRAINT "trade_ins_dealId_fkey";

-- DropIndex
DROP INDEX "deals_customerId_idx";

-- AlterTable
ALTER TABLE "dealership_config" ALTER COLUMN "id" SET DEFAULT 'dealership',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "deals" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "trade_ins" ALTER COLUMN "vin" SET DATA TYPE TEXT,
ALTER COLUMN "mileage" DROP DEFAULT,
ALTER COLUMN "acv" DROP DEFAULT,
ALTER COLUMN "allowance" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "lenders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxMarkupCap" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_applications" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "annualIncome" DECIMAL(12,2) NOT NULL,
    "employerName" TEXT NOT NULL,
    "employmentLengthMonths" INTEGER NOT NULL,
    "housingType" "HousingType" NOT NULL,
    "monthlyHousingPayment" DECIMAL(10,2) NOT NULL,
    "ssnEncrypted" TEXT NOT NULL,
    "ssnIv" TEXT NOT NULL,
    "ssnLastFour" CHAR(4) NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "status" "CreditApplicationStatus" NOT NULL DEFAULT 'Draft',
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lender_submissions" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "creditApplicationId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "LenderDecision" NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "buyRate" DECIMAL(5,2),
    "maxTerm" INTEGER,
    "stipulations" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lender_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selected_lender_decisions" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "lenderSubmissionId" TEXT NOT NULL,
    "buyRate" DECIMAL(5,2) NOT NULL,
    "rateMarkup" DECIMAL(5,2) NOT NULL,
    "sellRate" DECIMAL(5,2) NOT NULL,
    "selectedTerm" INTEGER NOT NULL,
    "selectedById" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selected_lender_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fi_products" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "productType" "FiProductType" NOT NULL,
    "providerName" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "deductible" DECIMAL(8,2),
    "contractNumber" TEXT,
    "status" "FiProductStatus" NOT NULL DEFAULT 'Active',
    "chargebackAmount" DECIMAL(10,2),
    "chargebackDate" DATE,
    "chargebackRecordedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fi_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_catalog_items" (
    "id" TEXT NOT NULL,
    "productType" "FiProductType" NOT NULL,
    "providerName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disclosure_requirements" (
    "id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "disclosureName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disclosure_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disclosure_confirmations" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "disclosureName" TEXT NOT NULL,
    "confirmedById" TEXT NOT NULL,
    "confirmedByName" TEXT NOT NULL,
    "confirmedByRole" TEXT NOT NULL,
    "confirmedAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disclosure_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fi_audit_log" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "actionType" "FiAuditActionType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fi_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lenders_name_key" ON "lenders"("name");

-- CreateIndex
CREATE INDEX "credit_applications_dealId_status_idx" ON "credit_applications"("dealId", "status");

-- CreateIndex
CREATE INDEX "lender_submissions_dealId_idx" ON "lender_submissions"("dealId");

-- CreateIndex
CREATE INDEX "lender_submissions_lenderId_idx" ON "lender_submissions"("lenderId");

-- CreateIndex
CREATE UNIQUE INDEX "selected_lender_decisions_dealId_key" ON "selected_lender_decisions"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "selected_lender_decisions_lenderSubmissionId_key" ON "selected_lender_decisions"("lenderSubmissionId");

-- CreateIndex
CREATE INDEX "fi_products_dealId_status_idx" ON "fi_products"("dealId", "status");

-- CreateIndex
CREATE INDEX "fi_products_chargebackDate_idx" ON "fi_products"("chargebackDate");

-- CreateIndex
CREATE INDEX "disclosure_requirements_jurisdiction_isActive_idx" ON "disclosure_requirements"("jurisdiction", "isActive");

-- CreateIndex
CREATE INDEX "disclosure_confirmations_dealId_idx" ON "disclosure_confirmations"("dealId");

-- CreateIndex
CREATE INDEX "fi_audit_log_dealId_createdAt_idx" ON "fi_audit_log"("dealId", "createdAt");

-- AddForeignKey
ALTER TABLE "deal_fees" ADD CONSTRAINT "deal_fees_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_ins" ADD CONSTRAINT "trade_ins_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lender_submissions" ADD CONSTRAINT "lender_submissions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lender_submissions" ADD CONSTRAINT "lender_submissions_creditApplicationId_fkey" FOREIGN KEY ("creditApplicationId") REFERENCES "credit_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lender_submissions" ADD CONSTRAINT "lender_submissions_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selected_lender_decisions" ADD CONSTRAINT "selected_lender_decisions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selected_lender_decisions" ADD CONSTRAINT "selected_lender_decisions_lenderSubmissionId_fkey" FOREIGN KEY ("lenderSubmissionId") REFERENCES "lender_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selected_lender_decisions" ADD CONSTRAINT "selected_lender_decisions_selectedById_fkey" FOREIGN KEY ("selectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fi_products" ADD CONSTRAINT "fi_products_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fi_products" ADD CONSTRAINT "fi_products_chargebackRecordedById_fkey" FOREIGN KEY ("chargebackRecordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_confirmations" ADD CONSTRAINT "disclosure_confirmations_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_confirmations" ADD CONSTRAINT "disclosure_confirmations_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fi_audit_log" ADD CONSTRAINT "fi_audit_log_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fi_audit_log" ADD CONSTRAINT "fi_audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
