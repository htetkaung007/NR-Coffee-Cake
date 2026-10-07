-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('ORDERS_MARK_PAID', 'MENU_AVAILABILITY', 'ADDON_AVAILABILITY', 'TABLES_MANAGE', 'REPORTS_VIEW');

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permission" "Permission" NOT NULL,
    "grantedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permission_key" ON "UserPermission"("userId", "permission");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing MANAGER gets the default grants
-- (lib/permissions.ts DEFAULT_MANAGER_PERMISSIONS). grantedById stays
-- NULL — no owner granted these; the migration did.
INSERT INTO "UserPermission" ("userId", "permission")
SELECT u."id", p.perm::"Permission"
FROM "User" u
CROSS JOIN (VALUES ('ORDERS_MARK_PAID'), ('MENU_AVAILABILITY'),
                   ('ADDON_AVAILABILITY')) AS p(perm)
WHERE u."role" = 'MANAGER'
ON CONFLICT DO NOTHING;
