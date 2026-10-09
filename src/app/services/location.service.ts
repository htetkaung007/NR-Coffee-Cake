import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { NotFoundError, ValidationError } from "../lib/errors";
import {
  LOCATION_DELETION_MESSAGES,
  locationDeletion,
} from "../lib/location/locationDeletion";
import { getFileStorageService } from "../lib/storage/getFileStorageService";
import { MenuLocationService } from "./menuLocation.service";

type Tx = Prisma.TransactionClient;

/**
 * Location domain — CRUD + archive lifecycle. Split out from AppService
 * (Rule 14) once Location-related methods would have pushed AppService
 * past the same threshold that triggered the Menu/MenuStock splits.
 *
 * Each method here does exactly one thing (Clean Code's "Do One Thing"):
 * creating, renaming, and archive-toggling are three separate methods,
 * not one method with an options bag — a bug in the rename path can't
 * accidentally break the archive path, and each is independently
 * testable.
 */
export class LocationService {
  /** For dropdowns/selectors that should only ever offer an operating
   *  location — e.g. the "Selected Location" switcher, the Add Manager
   *  form's location picker. Archived locations are deliberately excluded. */
  static async getActiveLocations(companyId: number) {
    return prisma.location.findMany({
      where: { companyId, isArchived: false },
      orderBy: { id: "asc" },
    });
  }

  /** For the Location list page, which needs to show archived locations
   *  too (with a badge + Unarchive button) — the one place in the app
   *  that intentionally does NOT filter isArchived out. */
  static async getAllLocationsForCompany(companyId: number) {
    return prisma.location.findMany({
      where: { companyId },
      orderBy: { id: "asc" },
    });
  }

  static async getLocationById(locationId: number) {
    return prisma.location.findFirst({ where: { id: locationId } });
  }

  /** Chain lookup — the location, if it belongs to this company
   *  (archived or not). Throws NotFoundError otherwise, so an id from
   *  another company is indistinguishable from one that doesn't exist. */
  static async getCompanyLocation(locationId: number, companyId: number) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, companyId },
    });
    if (!location) throw new NotFoundError("Location", locationId);
    return location;
  }

  /** Customer-facing top bar needs the shop's brand name (Company.name),
   *  not the Location's own name (which is a branch label like
   *  "Downtown" — see Company vs Location in schema.prisma). Does one
   *  thing: resolves locationId → company name, nothing else. Returns
   *  null for an archived/missing location, same as getMenusForLocation
   *  treats that case (customer sees a plain page, no name banner). */
  static async getShopNameForLocation(
    locationId: number,
  ): Promise<string | null> {
    const location = await prisma.location.findFirst({
      where: { id: locationId, isArchived: false },
    });
    return location?.name ?? null;
  }

  /** Does one thing: creates a location with a name. Nothing else —
   *  callers that also want it selected call setSelectedLocation
   *  themselves afterward, rather than this method reaching into a
   *  different concern. */
  /** Creates the location and its starting menus in one transaction
   *  (MenuLocationService.setUpNewLocation): "ALL" shows every menu
   *  there with stock 0, "EMPTY" hides every one until turned on. */
  static async createLocation(
    companyId: number,
    name: string,
    startingMenus: "ALL" | "EMPTY",
  ) {
    return prisma.$transaction(async (tx) => {
      const location = await tx.location.create({ data: { name, companyId } });
      await MenuLocationService.setUpNewLocation(tx, {
        locationId: location.id,
        companyId,
        startingMenus,
      });
      return location;
    });
  }

  /** Does one thing: renames. Does not touch isArchived/archivedAt —
   *  that's toggleLocationArchive's job. */
  static async updateLocationName(
    locationId: number,
    companyId: number,
    name: string,
  ) {
    await LocationService.getCompanyLocation(locationId, companyId);
    return prisma.location.update({
      where: { id: locationId },
      data: { name },
    });
  }

  /**
   * Does one thing: flips isArchived and stamps/clears archivedAt to
   * match (when it was closed — informational; deleting doesn't depend
   * on it, see deleteLocation).
   */
  static async toggleLocationArchive(
    locationId: number,
    companyId: number,
    isArchived: boolean,
  ) {
    await LocationService.getCompanyLocation(locationId, companyId);
    return prisma.location.update({
      where: { id: locationId },
      data: {
        isArchived,
        archivedAt: isArchived ? new Date() : null,
      },
    });
  }

  /** What the delete rule needs (lib/location/locationDeletion), read with `db` —
   *  the client, or the delete's own transaction. Chain lookup: a
   *  location that isn't this company's is NotFoundError. */
  private static async deletionFacts(
    db: Tx,
    locationId: number,
    companyId: number,
  ) {
    const location = await db.location.findFirst({
      where: { id: locationId, companyId },
      select: { id: true },
    });
    if (!location) throw new NotFoundError("Location", String(locationId));

    const [sessionCount, billCount, managerCount] = await Promise.all([
      db.orderSession.count({ where: { locationId } }),
      db.bill.count({ where: { locationId } }),
      // Every user assigned here, archived or not — each row would block
      // the delete (User.locationId has no onDelete).
      db.user.count({ where: { locationId } }),
    ]);
    return { hasSales: sessionCount + billCount > 0, managerCount };
  }

  /** Can this location be deleted permanently, and if not, why — for the
   *  Edit page (the delete itself checks again). */
  static async getDeletion(locationId: number, companyId: number) {
    return locationDeletion(
      await LocationService.deletionFacts(prisma, locationId, companyId),
    );
  }

  /**
   * Deletes a location with no sales history and no managers, right
   * away (lib/location/locationDeletion — a location with sales can only ever be
   * archived). One transaction, rule re-checked inside it: its setup rows
   * go first — draft picks at its tables (no round was ever sent there,
   * so every Order at them is a draft), the tables, stock rows and both
   * per-location hide tables — then any admin whose selected location
   * it was moves to the company's first other active location (or has
   * none, and is asked to pick one), then the location itself.
   *
   * The tables' QR images are deleted from file storage AFTER the commit
   * (an object-store delete can't be rolled back), best-effort: a
   * leftover image is harmless, a failed DB delete must not lose them.
   */
  static async deleteLocation(locationId: number, companyId: number) {
    const qrImageUrls = await prisma.$transaction(async (tx) => {
      const deletion = locationDeletion(
        await LocationService.deletionFacts(tx, locationId, companyId),
      );
      if (!deletion.allowed) {
        throw new ValidationError(LOCATION_DELETION_MESSAGES[deletion.reason]);
      }

      const tables = await tx.table.findMany({
        where: { locationId },
        select: { id: true, qrcodeImageUrl: true },
      });
      const tableIds = tables.map((table) => table.id);
      await tx.ordersAddon.deleteMany({
        where: { order: { tableId: { in: tableIds } } },
      });
      await tx.order.deleteMany({ where: { tableId: { in: tableIds } } });
      await tx.table.deleteMany({ where: { locationId } });
      await tx.menuStock.deleteMany({ where: { locationId } });
      await tx.disableLocationMenus.deleteMany({ where: { locationId } });
      await tx.disableLocationMenuCategories.deleteMany({
        where: { locationId },
      });

      const fallback = await tx.location.findFirst({
        where: { companyId, isArchived: false, id: { not: locationId } },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      if (fallback) {
        await tx.selectedLocation.updateMany({
          where: { locationId },
          data: { locationId: fallback.id },
        });
      } else {
        await tx.selectedLocation.deleteMany({ where: { locationId } });
      }

      await tx.location.delete({ where: { id: locationId } });
      return tables
        .map((table) => table.qrcodeImageUrl)
        .filter((url): url is string => Boolean(url));
    });

    const storage = getFileStorageService();
    await Promise.all(
      qrImageUrls.map((url) =>
        storage.delete(url).catch((error: unknown) => {
          console.error("[deleteLocation] QR image not removed:", url, error);
        }),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Selected location (per-user active-location pointer)
  // ---------------------------------------------------------------------

  /**
   * Managers have a fixed location (User.locationId) and never touch
   * SelectedLocation at all — there's nothing to switch between, so
   * their "selected" location is just whatever they're locked to.
   * Admins go through the normal SelectedLocation table, since they
   * can switch between any of the company's locations. Both paths
   * return the same shape ({ locationId, ... }) so callers like
   * MenuService.getMenusWithDetails(companyId, selectedLocation.locationId)
   * work unchanged regardless of which role called this.
   *
   * Only ever a location of `companyId` (the session's): a user or a
   * location of another company reads as "none selected" (null).
   */
  static async getSelectedLocation(userId: number, companyId: number) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) return null;

    if (user.role === "MANAGER") {
      if (!user.locationId) return null; // Manager not yet assigned a location
      const own = await prisma.location.findFirst({
        where: { id: user.locationId, companyId },
        select: { id: true },
      });
      return own ? { locationId: own.id } : null;
    }

    return prisma.selectedLocation.findFirst({
      where: { userId, location: { companyId } },
      orderBy: { id: "asc" },
    });
  }

  /**
   * Admin-only: switches the Admin's active location. Managers can't
   * call this — their location is fixed via User.locationId (see
   * getSelectedLocation) and isn't meant to change from this page.
   * Upserts on the @@unique([userId]) constraint so an Admin always
   * has exactly one active location, never zero or two.
   */
  static async setSelectedLocation(
    userId: number,
    companyId: number,
    locationId: number,
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundError("User", String(userId));
    if (user.role === "MANAGER") {
      throw new ValidationError(
        "Managers can't switch locations — contact your Admin.",
      );
    }
    await LocationService.getCompanyLocation(locationId, companyId);

    return prisma.selectedLocation.upsert({
      where: { userId },
      update: { locationId },
      create: { userId, locationId },
    });
  }
}
