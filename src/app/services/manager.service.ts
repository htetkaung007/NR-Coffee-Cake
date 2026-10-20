import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { NotFoundError, ValidationError } from "../lib/errors";
import {
  DEFAULT_MANAGER_PERMISSIONS,
  isPermissionKey,
  permissionChanges,
  type PermissionKey,
} from "../lib/access/permissions";
import {
  MANAGER_ASSIGNMENT_CODES,
  MANAGER_ASSIGNMENT_MESSAGES,
  managerAssignmentBlock,
} from "../lib/location/managerAssignment";
import { AppService } from "./app.service";
import { LocationService } from "./location.service";
import { MenuService } from "./menu.service";

/** One manager as the owner's Settings list shows them. */
export interface ManagerSummary {
  id: number;
  email: string;
  name: string | null;
  locationId: number | null;
  locationName: string | null;
  permissions: PermissionKey[];
}

/** Manager accounts — creating one for a location, the owner's list of
 *  them, changing what each may do, moving one to another location and
 *  removing one. Its own Service (Rule 14): it
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
      throw new ValidationError("Email is already registered.", "EMAIL_TAKEN");
    }

    // The location comes from the owner's form: it must be the owner's
    // own company's (same NotFoundError as one that doesn't exist), and
    // open (managerAssignmentBlock).
    const location = await LocationService.getCompanyLocation(
      input.locationId,
      input.companyId,
    );
    const block = managerAssignmentBlock({ target: location });
    if (block) {
      throw new ValidationError(
        MANAGER_ASSIGNMENT_MESSAGES[block],
        MANAGER_ASSIGNMENT_CODES[block],
      );
    }

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
        locationId: true,
        location: { select: { name: true } },
        permissions: { select: { permission: true } },
      },
    });
    return managers.map((manager) => ({
      id: manager.id,
      email: manager.email,
      name: manager.name,
      locationId: manager.locationId,
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

  /** Chain lookup — a MANAGER of `companyId` (archived or not, so an
   *  archived one can still be moved or removed). An owner (ADMIN), a
   *  user of another company or an unknown id is the same NotFoundError,
   *  so the id's existence elsewhere isn't revealed. */
  private static async findManager(managerId: number, companyId: number) {
    const manager = await prisma.user.findFirst({
      where: { id: managerId, companyId, role: "MANAGER" },
      select: { id: true, locationId: true },
    });
    if (!manager) throw new NotFoundError("Manager", managerId);
    return manager;
  }

  /** Moves a manager to another open location of the company
   *  (managerAssignmentBlock: not a closed one, not the one they're
   *  already at). Their permissions stay as they are. Takes effect on
   *  their very next request — their location is read from User.locationId
   *  every time (LocationService.getSelectedLocation). */
  static async moveManager(input: {
    managerId: number;
    companyId: number;
    locationId: number;
  }) {
    const manager = await ManagerService.findManager(
      input.managerId,
      input.companyId,
    );
    const location = await LocationService.getCompanyLocation(
      input.locationId,
      input.companyId,
    );
    const block = managerAssignmentBlock({
      target: location,
      currentLocationId: manager.locationId,
    });
    if (block) {
      throw new ValidationError(
        MANAGER_ASSIGNMENT_MESSAGES[block],
        MANAGER_ASSIGNMENT_CODES[block],
      );
    }

    await prisma.user.update({
      where: { id: manager.id },
      data: { locationId: location.id },
    });
    return { id: manager.id, locationId: location.id, locationName: location.name };
  }

  /** Removes a manager's account for good. No sales data is lost: the
   *  order, bill and cancellation history don't point at a User, and the
   *  one history row that does — OrderVoid.voidedById — is set to null
   *  (SetNull) while the void keeps the name frozen on it
   *  (voidedByName), so "who voided it" survives. Their UserPermission
   *  rows cascade, and a grant row that names them
   *  as the granter (never expected — only owners grant) is set to null.
   *  One transaction: a leftover SelectedLocation row (managers never
   *  use one, but its foreign key would block the delete) goes first.
   *  Takes effect on their very next request — the guards re-check that
   *  the session's user still exists (lib/access/roleGuard). */
  static async removeManager(input: { managerId: number; companyId: number }) {
    const manager = await ManagerService.findManager(
      input.managerId,
      input.companyId,
    );
    await prisma.$transaction(async (tx) => {
      await tx.selectedLocation.deleteMany({ where: { userId: manager.id } });
      await tx.user.delete({ where: { id: manager.id } });
    });
    return { id: manager.id };
  }
}
