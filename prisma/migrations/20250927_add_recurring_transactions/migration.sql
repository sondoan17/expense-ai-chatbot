-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "public"."RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."RecurringTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "public"."TxnType" NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "currency" "public"."Currency" NOT NULL DEFAULT 'VND',
  "note" TEXT,
  "categoryId" TEXT,
  "frequency" "public"."RecurringFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "dayOfMonth" INTEGER,
  "weekday" INTEGER,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "timezone" TEXT NOT NULL,
  "nextRunAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecurringTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RecurringTransaction_userId_isActive_nextRunAt_idx" ON "public"."RecurringTransaction"("userId", "isActive", "nextRunAt");

-- AlterTable
ALTER TABLE "public"."Transaction"
  ADD COLUMN IF NOT EXISTS "recurringTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_recurringTransactionId_idx" ON "public"."Transaction"("recurringTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_recurringTransactionId_scheduledFor_key" ON "public"."Transaction"("recurringTransactionId", "scheduledFor");

-- AddForeignKey
ALTER TABLE "public"."Transaction"
  ADD CONSTRAINT "Transaction_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "public"."RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
