import { prisma } from "../utils/prisma";
import { NotFoundError } from "../lib/errors";
import {
  isPermissionKey,
  permissionChanges,
  type PermissionKey,
} from "../lib/permissions";

/** One manager as the owner's Settings list shows them. */
export interface ManagerSummary {
  id: number;
  email: string;
  name: string | null;
  locationName: string | null;
  permissions: PermissionKey[];
}

/** What an owner has granted a MANAGER (UserPermission rows), and the
 *  owner's view of their managers. */
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

  /** The company's active (not archived) managers, by email, each with
   *  their assigned location and grants. Owners (ADMIN) are never listed. */
  static async listManagers(companyId: number): Promise<ManagerSummary[]> {
    const managers = await prisma.user.findMany({
      where: { companyId, role: "MANAGER", isArchived: false },
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        location: { select: { name: true } },
        permissions: { select: { permission: true } },
      },
    });
    return managers.map((manager) => ({
      id: manager.id,
      email: manager.email,
      name: manager.name,
      locationName: manager.location?.name ?? null,
      permissions: manager.permissions
        .map((row) => row.permission)
        .filter(isPermissionKey),
    }));
  }

  /** Replaces a manager's grants with `permissions`, in ONE transaction:
   *  removes the no-longer ticked, adds the newly ticked (granted by
   *  `ownerId`), and leaves unchanged rows alone so their history
   *  survives. The manager must be an active MANAGER of `companyId` —
   *  anything else (another company, an owner, archived, unknown) is the
   *  same NotFoundError, so the id's existence elsewhere isn't revealed. */
  static async setManagerPermissions(input: {
    companyId: number;
    ownerId: number;
    managerId: number;
    permissions: readonly PermissionKey[];
  }): Promise<PermissionKey[]> {
    return prisma.$transaction(async (tx) => {
      const manager = await tx.user.findFirst({
        where: {
          id: input.managerId,
          companyId: input.companyId,
          role: "MANAGER",
          isArchived: false,
        },
        select: { id: true, permissions: { select: { permission: true } } },
      });
      if (!manager) throw new NotFoundError("Manager", input.managerId);

      const current = manager.permissions
        .map((row) => row.permission)
        .filter(isPermissionKey);
      const { add, remove } = permissionChanges(current, input.permissions);

      if (remove.length > 0) {
        await tx.userPermission.deleteMany({
          where: { userId: manager.id, permission: { in: remove } },
        });
      }
      if (add.length > 0) {
        await tx.userPermission.createMany({
          data: add.map((permission) => ({
            userId: manager.id,
            permission,
            grantedById: input.ownerId,
          })),
          skipDuplicates: true,
        });
      }
      return [...new Set(input.permissions)];
    });
  }
}
