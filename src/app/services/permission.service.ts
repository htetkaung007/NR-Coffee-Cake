import { prisma } from "../utils/prisma";
import { isPermissionKey, type PermissionKey } from "../lib/access/permissions";

/** What an owner has granted a MANAGER (UserPermission rows) — only the
 *  per-request check lives here; managing manager accounts and their
 *  grants is ManagerService's. */
export class PermissionService {
  /** The manager's granted permissions — read from the database on
   *  EVERY check (never cached in the session/JWT), so a revoked
   *  permission stops working on the very next request. Values outside
   *  the catalog (shouldn't exist — the enum matches it) are dropped. */
  static async getGrantedPermissions(userId: number): Promise<PermissionKey[]> {
    const rows = await prisma.userPermission.findMany({
      where: { userId },
      select: { permission: true },
    });
    return rows.map((row) => row.permission).filter(isPermissionKey);
  }
}
