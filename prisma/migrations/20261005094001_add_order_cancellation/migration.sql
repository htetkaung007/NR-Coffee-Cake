-- CreateEnum
CREATE TYPE "RejectReason" AS ENUM ('OUT_OF_STOCK', 'SUSPECTED_FAKE', 'CUSTOMER_REQUEST', 'OTHER');

-- CreateTable
CREATE TABLE "OrderCancellation" (
    "id" SERIAL NOT NULL,
    "orderSessionId" INTEGER NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "rejectReason" "RejectReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderCancellation_orderSessionId_key" ON "OrderCancellation"("orderSessionId");

-- AddForeignKey
ALTER TABLE "OrderCancellation" ADD CONSTRAINT "OrderCancellation_orderSessionId_fkey" FOREIGN KEY ("orderSessionId") REFERENCES "OrderSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
