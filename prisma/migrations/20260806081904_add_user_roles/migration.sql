/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `SelectedLocation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locationId" INTEGER,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

-- CreateIndex
CREATE UNIQUE INDEX "SelectedLocation_userId_key" ON "SelectedLocation"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
