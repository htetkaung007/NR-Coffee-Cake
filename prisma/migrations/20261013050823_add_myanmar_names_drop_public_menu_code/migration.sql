/*
  Warnings:

  - You are about to drop the column `publicMenuCode` on the `Location` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Location_publicMenuCode_key";

-- AlterTable
ALTER TABLE "Addon" ADD COLUMN     "nameMy" TEXT;

-- AlterTable
ALTER TABLE "AddonCategories" ADD COLUMN     "nameMy" TEXT;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "publicMenuCode";

-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "descriptionMy" TEXT,
ADD COLUMN     "nameMy" TEXT;

-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "nameMy" TEXT;
