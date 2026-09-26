-- CreateEnum
CREATE TYPE "CancelReason" AS ENUM ('REJECTED', 'EXPIRED', 'UNSUBMITTED');

-- AlterTable
ALTER TABLE "OrderSession" ADD COLUMN     "cancelReason" "CancelReason";
