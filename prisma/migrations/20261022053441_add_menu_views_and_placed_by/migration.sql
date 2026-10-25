-- CreateEnum
CREATE TYPE "PlacedBy" AS ENUM ('CUSTOMER', 'STAFF');

-- AlterTable
ALTER TABLE "OrderSession" ADD COLUMN     "placedBy" "PlacedBy" NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstFailedLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MenuViewDaily" (
    "id" SERIAL NOT NULL,
    "menuId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "viewers" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuViewDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuViewSeen" (
    "id" SERIAL NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "menuId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuViewSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuViewDaily_locationId_day_idx" ON "MenuViewDaily"("locationId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "MenuViewDaily_menuId_locationId_day_key" ON "MenuViewDaily"("menuId", "locationId", "day");

-- CreateIndex
CREATE INDEX "MenuViewSeen_day_idx" ON "MenuViewSeen"("day");

-- CreateIndex
CREATE UNIQUE INDEX "MenuViewSeen_viewerKey_menuId_day_key" ON "MenuViewSeen"("viewerKey", "menuId", "day");

-- AddForeignKey
ALTER TABLE "MenuViewDaily" ADD CONSTRAINT "MenuViewDaily_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuViewDaily" ADD CONSTRAINT "MenuViewDaily_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuViewSeen" ADD CONSTRAINT "MenuViewSeen_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
