/*
  Warnings:

  - You are about to drop the column `status` on the `orders` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_orderSessionId_fkey";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "status",
ADD COLUMN     "contributorToken" TEXT,
ALTER COLUMN "orderSessionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_orderSessionId_fkey" FOREIGN KEY ("orderSessionId") REFERENCES "OrderSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
