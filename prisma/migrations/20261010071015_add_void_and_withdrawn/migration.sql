-- CreateEnum
CREATE TYPE "VoidReason" AS ENUM ('CUSTOMER_CHANGED_MIND', 'WRONG_ITEM', 'OTHER');

-- AlterEnum
ALTER TYPE "CancelReason" ADD VALUE 'WITHDRAWN';

-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'ORDERS_VOID';

-- CreateTable
CREATE TABLE "OrderVoid" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "VoidReason" NOT NULL,
    "note" VARCHAR(120),
    "stockReturned" BOOLEAN NOT NULL,
    "voidedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderVoid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderVoid_orderId_idx" ON "OrderVoid"("orderId");

-- CreateIndex
CREATE INDEX "OrderVoid_voidedById_idx" ON "OrderVoid"("voidedById");

-- AddForeignKey
ALTER TABLE "OrderVoid" ADD CONSTRAINT "OrderVoid_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVoid" ADD CONSTRAINT "OrderVoid_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
