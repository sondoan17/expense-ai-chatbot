-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "public"."ChatRole" AS ENUM ('USER', 'ASSISTANT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "public"."ChatMessageStatus" AS ENUM ('SENT', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."ChatMessage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "public"."ChatRole" NOT NULL,
  "status" "public"."ChatMessageStatus" NOT NULL DEFAULT 'SENT',
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChatMessage_userId_createdAt_idx" ON "public"."ChatMessage"("userId", "createdAt");
