/*
  Warnings:

  - Added the required column `orderSessionId` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "orderSessionId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "activeSessionId" INTEGER;

-- CreateTable
CREATE TABLE "OrderSession" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "tableId" INTEGER,
    "isCounter" BOOLEAN NOT NULL DEFAULT false,
    "status" "ORDERSTATUS" NOT NULL DEFAULT 'CART',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrderSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_orderSessionId_fkey" FOREIGN KEY ("orderSessionId") REFERENCES "OrderSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSession" ADD CONSTRAINT "OrderSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
