-- Migration: add_deals_module

-- Add FniManager role to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FniManager';

-- New enums for deals
CREATE TYPE "DealType" AS ENUM ('Cash', 'Finance', 'Lease');
CREATE TYPE "DealStatus" AS ENUM ('Pending', 'Desking', 'Fni', 'ContractsSigned', 'Delivered', 'Funded', 'Unwound');
CREATE TYPE "TradeInCondition" AS ENUM ('Excellent', 'Good', 'Fair', 'Poor');
CREATE TYPE "DocumentType" AS ENUM ('BuyersOrder', 'BillOfSale');

-- Deal number sequence (T006) — starts at 1001 by default; DealershipConfig.dealNumberOffset
-- documents the intended starting offset for display/validation but does NOT re-seed this sequence.
CREATE SEQUENCE IF NOT EXISTS deal_number_seq START WITH 1001 INCREMENT BY 1;

-- Deal table
-- NOTE: No deletedAt — deal records must be retained for 7 years (regulatory requirement).
-- No soft-delete or hard-delete endpoints are exposed.
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "dealNumber" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "dealType" "DealType" NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'Pending',
    "salePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "downPayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rebates" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "apr" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "term" INTEGER NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountFinanced" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monthlyPayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "frontEndGross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "backEndGross" DECIMAL(12,2),
    "createdById" TEXT NOT NULL,
    "fundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deals_dealNumber_key" ON "deals"("dealNumber");
CREATE INDEX "deals_status_idx" ON "deals"("status");
CREATE INDEX "deals_createdById_idx" ON "deals"("createdById");
CREATE INDEX "deals_vehicleId_idx" ON "deals"("vehicleId");
CREATE INDEX "deals_fundedAt_idx" ON "deals"("fundedAt");
CREATE INDEX "deals_customerId_idx" ON "deals"("customerId");

-- DealFee table
CREATE TABLE "deal_fees" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deal_fees_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deal_fees_dealId_idx" ON "deal_fees"("dealId");

-- TradeIn table (one per deal, unique constraint enforced)
CREATE TABLE "trade_ins" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "vin" VARCHAR(17),
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "condition" "TradeInCondition" NOT NULL,
    "acv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payoff" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lenderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trade_ins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trade_ins_dealId_key" ON "trade_ins"("dealId");

-- DealStatusHistory table — insert-only, no update or delete
CREATE TABLE "deal_status_history" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "previousStatus" "DealStatus",
    "newStatus" "DealStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deal_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deal_status_history_dealId_createdAt_idx" ON "deal_status_history"("dealId", "createdAt");

-- GeneratedDocument table — no delete endpoint
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "generated_documents_dealId_generatedAt_idx" ON "generated_documents"("dealId", "generatedAt");

-- DealershipConfig table — single-row configuration
CREATE TABLE "dealership_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "dealNumberOffset" INTEGER NOT NULL DEFAULT 1001,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dealership_config_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "deals" ADD CONSTRAINT "deals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deal_fees" ADD CONSTRAINT "deal_fees_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_ins" ADD CONSTRAINT "trade_ins_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_status_history" ADD CONSTRAINT "deal_status_history_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deal_status_history" ADD CONSTRAINT "deal_status_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed initial DealershipConfig row (T007)
INSERT INTO "dealership_config" ("id", "dealNumberOffset", "updatedAt")
VALUES ('default', 1001, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
