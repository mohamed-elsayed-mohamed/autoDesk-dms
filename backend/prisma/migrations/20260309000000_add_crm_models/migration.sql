-- Migration: add_crm_models
-- Run: npx prisma migrate dev --name add-crm-models

-- Enable pg_trgm for partial customer search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add new roles to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SalesManager';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BDCAgent';

-- New enums
CREATE TYPE "LeadSource" AS ENUM ('Website', 'Phone', 'WalkIn', 'AutoTrader', 'CarsDotCom', 'Other');
CREATE TYPE "LeadStatus" AS ENUM ('New', 'Contacted', 'AppointmentSet', 'Showed', 'Negotiating', 'Sold', 'Lost');
CREATE TYPE "ActivityType" AS ENUM ('Call', 'Email', 'Text', 'Visit', 'Note');
CREATE TYPE "ActivityDirection" AS ENUM ('Inbound', 'Outbound');
CREATE TYPE "TaskStatus" AS ENUM ('Pending', 'Completed', 'Cancelled');
CREATE TYPE "TaskType" AS ENUM ('Call', 'Email', 'Text', 'Quote', 'FollowUp', 'Other');
CREATE TYPE "NotificationType" AS ENUM ('LeadAssigned', 'LeadReassigned');
CREATE TYPE "PreferredContact" AS ENUM ('Phone', 'Email', 'Text');

-- Add role index to User
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- Customer table
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" VARCHAR(2),
    "zip" VARCHAR(10),
    "preferredContact" "PreferredContact" NOT NULL DEFAULT 'Phone',
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_lastName_firstName_idx" ON "Customer"("lastName", "firstName");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_archivedAt_idx" ON "Customer"("archivedAt");

-- Trigram indexes for partial-match search
CREATE INDEX "idx_customers_name_trgm" ON "Customer" USING gin ((lower("firstName") || ' ' || lower("lastName")) gin_trgm_ops);
CREATE INDEX "idx_customers_phone_trgm" ON "Customer" USING gin ("phone" gin_trgm_ops);
CREATE INDEX "idx_customers_email_trgm" ON "Customer" USING gin ("email" gin_trgm_ops);

-- Lead table
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "sourceOther" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'New',
    "assignedTo" TEXT,
    "lostReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_customerId_idx" ON "Lead"("customerId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_assignedTo_idx" ON "Lead"("assignedTo");
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- LeadVehicle join table
CREATE TABLE "LeadVehicle" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadVehicle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadVehicle_leadId_vehicleId_key" ON "LeadVehicle"("leadId", "vehicleId");
CREATE INDEX "LeadVehicle_vehicleId_idx" ON "LeadVehicle"("vehicleId");

-- LeadStatusHistory table
CREATE TABLE "LeadStatusHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "LeadStatus" NOT NULL,
    "toStatus" "LeadStatus" NOT NULL,
    "lostReason" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadStatusHistory_leadId_changedAt_idx" ON "LeadStatusHistory"("leadId", "changedAt");

-- Activity table
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "leadId" TEXT,
    "type" "ActivityType" NOT NULL,
    "direction" "ActivityDirection",
    "content" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Activity_customerId_performedAt_idx" ON "Activity"("customerId", "performedAt");
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");

-- Task table
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "type" "TaskType",
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_assignedTo_status_dueAt_idx" ON "Task"("assignedTo", "status", "dueAt");
CREATE INDEX "Task_leadId_idx" ON "Task"("leadId");

-- Notification table
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- RoundRobinState table
CREATE TABLE "RoundRobinState" (
    "id" TEXT NOT NULL DEFAULT 'lead-assignment',
    "lastAssignedUserId" TEXT,
    CONSTRAINT "RoundRobinState_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadVehicle" ADD CONSTRAINT "LeadVehicle_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadVehicle" ADD CONSTRAINT "LeadVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed initial RoundRobinState row
INSERT INTO "RoundRobinState" ("id", "lastAssignedUserId") VALUES ('lead-assignment', NULL) ON CONFLICT ("id") DO NOTHING;
