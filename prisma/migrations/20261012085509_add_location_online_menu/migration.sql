/*
  Warnings:

  - A unique constraint covering the columns `[publicMenuCode]` on the table `Location` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "onlineMenuEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicMenuCode" VARCHAR(16);

-- CreateIndex
CREATE UNIQUE INDEX "Location_publicMenuCode_key" ON "Location"("publicMenuCode");
