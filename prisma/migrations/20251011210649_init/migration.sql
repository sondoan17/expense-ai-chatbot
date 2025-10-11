-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('VND', 'USD');

-- CreateEnum
CREATE TYPE "public"."TxnType" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "public"."RecurringFreq" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "public"."ChatMessageStatus" AS ENUM ('SENT', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."AiPersonality" AS ENUM ('FRIENDLY', 'PROFESSIONAL', 'CASUAL', 'HUMOROUS', 'INSULTING', 'ENTHUSIASTIC');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."TxnType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'VND',
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "freq" "public"."RecurringFreq" NOT NULL,
    "dayOfMonth" INTEGER,
    "weekday" INTEGER,
    "timeOfDay" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "type" "public"."TxnType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'VND',
    "categoryId" TEXT,
    "note" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringRunLog" (
    "id" TEXT NOT NULL,
    "recurringRuleId" TEXT NOT NULL,
    "occurredDate" TIMESTAMP(3) NOT NULL,
    "txnId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Budget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "categoryId" TEXT,
    "limitAmount" DECIMAL(18,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'VND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringBudgetRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "freq" "public"."RecurringFreq" NOT NULL,
    "dayOfMonth" INTEGER,
    "weekday" INTEGER,
    "timeOfDay" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'VND',
    "categoryId" TEXT,
    "note" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBudgetRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringBudgetRunLog" (
    "id" TEXT NOT NULL,
    "recurringBudgetRuleId" TEXT NOT NULL,
    "occurredDate" TIMESTAMP(3) NOT NULL,
    "budgetId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringBudgetRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ChatRole" NOT NULL,
    "status" "public"."ChatMessageStatus" NOT NULL DEFAULT 'SENT',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiPersonality" "public"."AiPersonality" NOT NULL DEFAULT 'FRIENDLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE INDEX "Transaction_userId_occurredAt_idx" ON "public"."Transaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "public"."Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "RecurringRule_userId_enabled_nextRunAt_idx" ON "public"."RecurringRule"("userId", "enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringRule_categoryId_idx" ON "public"."RecurringRule"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringRunLog_recurringRuleId_occurredDate_key" ON "public"."RecurringRunLog"("recurringRuleId", "occurredDate");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_year_month_categoryId_key" ON "public"."Budget"("userId", "year", "month", "categoryId");

-- CreateIndex
CREATE INDEX "RecurringBudgetRule_userId_enabled_nextRunAt_idx" ON "public"."RecurringBudgetRule"("userId", "enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringBudgetRule_categoryId_idx" ON "public"."RecurringBudgetRule"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringBudgetRunLog_recurringBudgetRuleId_occurredDate_key" ON "public"."RecurringBudgetRunLog"("recurringBudgetRuleId", "occurredDate");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "public"."ChatMessage"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "public"."UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "public"."PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "public"."PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "public"."PasswordResetToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringRunLog" ADD CONSTRAINT "RecurringRunLog_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "public"."RecurringRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringBudgetRule" ADD CONSTRAINT "RecurringBudgetRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringBudgetRunLog" ADD CONSTRAINT "RecurringBudgetRunLog_recurringBudgetRuleId_fkey" FOREIGN KEY ("recurringBudgetRuleId") REFERENCES "public"."RecurringBudgetRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
