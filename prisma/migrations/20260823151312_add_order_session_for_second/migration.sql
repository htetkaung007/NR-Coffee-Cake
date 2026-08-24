/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `OrderSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `locationId` to the `OrderSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderNumber` to the `OrderSession` table without a default value. This is not possible if the table is not empty.
  - The required column `token` was added to the `OrderSession` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "OrderSession" ADD COLUMN     "approvalExpiresAt" TIMESTAMP(3),
ADD COLUMN     "locationId" INTEGER NOT NULL,
ADD COLUMN     "orderNumber" TEXT NOT NULL,
ADD COLUMN     "token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OrderSession_token_key" ON "OrderSession"("token");

-- AddForeignKey
ALTER TABLE "OrderSession" ADD CONSTRAINT "OrderSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
