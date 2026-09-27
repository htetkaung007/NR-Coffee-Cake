-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "MenuCategory_companyId_sortOrder_idx" ON "MenuCategory"("companyId", "sortOrder");
