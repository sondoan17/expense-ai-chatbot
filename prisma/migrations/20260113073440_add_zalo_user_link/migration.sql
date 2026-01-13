-- CreateTable
CREATE TABLE "ZaloUserLink" (
    "id" TEXT NOT NULL,
    "zaloUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZaloUserLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZaloUserLink_zaloUserId_key" ON "ZaloUserLink"("zaloUserId");

-- CreateIndex
CREATE INDEX "ZaloUserLink_userId_idx" ON "ZaloUserLink"("userId");

-- AddForeignKey
ALTER TABLE "ZaloUserLink" ADD CONSTRAINT "ZaloUserLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
