-- AlterTable
ALTER TABLE "OrderSession" ADD COLUMN     "billSessionId" INTEGER;

-- CreateIndex
CREATE INDEX "OrderSession_billSessionId_idx" ON "OrderSession"("billSessionId");
