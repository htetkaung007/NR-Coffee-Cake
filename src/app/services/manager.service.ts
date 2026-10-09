import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { NotFoundError, ValidationError } from "../lib/errors";
import {
  DEFAULT_MANAGER_PERMISSIONS,
  isPermissionKey,
  permissionChanges,
  type PermissionKey,
} from "../lib/access/permissions";
import { AppService } from "./app.service";
import { LocationService } from "./location.service";
import { MenuService } from "./menu.service";

/** One manager as the owner's Settings list shows them. */
export interface ManagerSummary {
  id: number;
  email: string;
  name: string | null;
  locationName: string | null;
  permissions: PermissionKey[];
}

/** Manager accounts — creating one for a location, the owner's list of
 *  them, and changing what each may do. Its own Service (Rule 14): it
 *  changes when the owner's manager settings change, not with sign-up
 *  (AppService) or the per-request permission check (PermissionService). */
export class ManagerService {
  /**
   * Admin-only flow: creates a Manager account fixed to one location.
   * Unlike registerUser (which bootstraps a whole new Company),
   * this attaches to the Admin's *existing* company and location —
   * no createDefaultCompany/createDefaultLocation involved.
   *
   * Also seeds a MenuStock row (quantity 0) at that location for every
   * menu the company already has, rather than creating a placeholder
   * "Default Menu": a brand-new branch should start with the same menu
   * the rest of the company sells (just not stocked yet), not an empty
   * menu the Manager has to rebuild from scratch. skipDuplicates guards
   * against a stock row that might already exist for this
   * menu+location pair (e.g. Admin previously stocked ahead of hiring
   * a Manager for this branch).
   */
  static async createManagerForLocation(input: {
    email: string;
    password: string;
    companyId: number;
    locationId: number;
    /** The owner creating the manager — recorded as who granted. */
    ownerId: number;
    /** What the new manager may do (default: the catalog's defaults). */
    permissions?: readonly PermissionKey[];
  }) {
    const permissions = [
      ...new Set(input.permissions ?? DEFAULT_MANAGER_PERMISSIONS),
    ];
    const existingUser = await AppService.getUserByEmail(input.email);
    if (existingUser) {
      throw new ValidationError("Email is already registered.");
    }

    // The location comes from the owner's form: it must be the owner's
    // own company's (same NotFoundError as one that doesn't exist).
    await LocationService.getCompanyLocation(input.locationId, input.companyId);

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const companyMenus = await MenuService.getMenus(input.companyId);

    return prisma.$transaction(async (tx) => {
      const manager = await AppService.createUserForCompany(
        tx,
        { email: input.email },
        input.companyId,
        hashedPassword,
        "MANAGER",
        input.locationId,
      );

      // In the same transaction: a manager must never exist without the
      // grants the owner picked.
      if (permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map((permission) => ({
            userId: manager.id,
            permission,
            grantedById: input.ownerId,
          })),
        });
      }

      // Stock rows only (quantity 0, existing ones untouched). It never
      // touches DisableLocationMenus, so a menu hidden at this location
      // stays hidden — a stock row alone doesn't list it there.
      if (companyMenus.length > 0) {
        await tx.menuStock.createMany({
          data: companyMenus.map((menu) => ({
            menuId: menu.id,
            locationId: input.locationId,
            quantity: 0,
          })),
          skipDuplicates: true,
        });
      }

      return manager;
    });
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
