/*
  Warnings:

  - Made the column `isCounter` on table `tables` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tables" ALTER COLUMN "isCounter" SET NOT NULL,
ALTER COLUMN "isCounter" SET DEFAULT false;
