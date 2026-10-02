/*
  Warnings:

  - A unique constraint covering the columns `[clientRequestId]` on the table `OrderSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OrderSession" ADD COLUMN     "clientRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OrderSession_clientRequestId_key" ON "OrderSession"("clientRequestId");
