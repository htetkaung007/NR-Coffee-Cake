/*
  Warnings:

  - You are about to drop the column `orderNumber` on the `OrderSession` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ORDERSTATUS" ADD VALUE 'PENDING_APPROVAL';

-- AlterTable
ALTER TABLE "OrderSession" DROP COLUMN "orderNumber";

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "counterAccessKey" TEXT;
