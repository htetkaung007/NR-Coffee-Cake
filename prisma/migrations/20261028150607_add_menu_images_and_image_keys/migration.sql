/*
  Warnings:

  - You are about to drop the column `assetUrl` on the `Menu` table. All the data in the column will be lost.
  - You are about to drop the column `qrcodeImageUrl` on the `tables` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Menu" DROP COLUMN "assetUrl";

-- AlterTable
ALTER TABLE "tables" DROP COLUMN "qrcodeImageUrl",
ADD COLUMN     "qrImageKey" TEXT;

-- CreateTable
CREATE TABLE "MenuImage" (
    "id" SERIAL NOT NULL,
    "menuId" INTEGER NOT NULL,
    "imageKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuImage_menuId_position_key" ON "MenuImage"("menuId", "position");

-- AddForeignKey
ALTER TABLE "MenuImage" ADD CONSTRAINT "MenuImage_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
