-- Migration: Employee Management & Sales Manager updates
-- Run: npx prisma migrate dev --name employee_management

-- Rename SALES_STAFF to SALES_MANAGER
ALTER TYPE "Role" RENAME VALUE 'SALES_STAFF' TO 'SALES_MANAGER';

-- Create UserStatus enum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- User table updates
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);

-- Backfill employeeId for existing users
UPDATE "User" SET "employeeId" = 'EMP-' || SUBSTRING(id, 1, 8) WHERE "employeeId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "employeeId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_employeeId_key" ON "User"("employeeId");

-- Customer table updates
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CompanySettings updates
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "currencySymbol" TEXT NOT NULL DEFAULT '$';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "currencyCode" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "decimalPlaces" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "taxName" TEXT NOT NULL DEFAULT 'VAT';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "taxNumber" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "fiscalYearStart" TEXT NOT NULL DEFAULT '01-01';
