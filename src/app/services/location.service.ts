import { prisma } from "../utils/prisma";
import { NotFoundError, ValidationError } from "../lib/errors";

const HARD_DELETE_GRACE_DAYS = 60;

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

  /** Does one thing: creates a location with a name. Nothing else —
   *  callers that also want it selected call setSelectedLocation
   *  themselves afterward, rather than this method reaching into a
   *  different concern. */
  static async createLocation(companyId: number, name: string) {
    return prisma.location.create({ data: { name, companyId } });
  }

  /** Does one thing: renames. Does not touch isArchived/archivedAt —
   *  that's toggleLocationArchive's job. */
  static async updateLocationName(locationId: number, name: string) {
    return prisma.location.update({
      where: { id: locationId },
      data: { name },
    });
  }

  /**
   * Does one thing: flips isArchived and stamps/clears archivedAt to
   * match. Archiving starts the 60-day hard-delete countdown;
   * unarchiving cancels it by clearing the timestamp — a location
   * that's been closed and reopened shouldn't carry over a stale
   * countdown from its last closure.
   */
  static async toggleLocationArchive(locationId: number, isArchived: boolean) {
    return prisma.location.update({
      where: { id: locationId },
      data: {
        isArchived,
        archivedAt: isArchived ? new Date() : null,
      },
    });
  }

  /**
   * Does one thing: deletes, after validating the location is archived
   * and the 60-day grace period has passed. Does not archive first —
   * callers must have already called toggleLocationArchive; this
   * method only ever tears down, it doesn't also transition state.
   */
  static async hardDeleteLocation(locationId: number) {
    const location = await LocationService.getLocationById(locationId);
    if (!location) throw new NotFoundError("Location", String(locationId));

    if (!location.isArchived || !location.archivedAt) {
      throw new ValidationError(
        "Only an archived location can be permanently deleted.",
      );
    }

    const daysSinceArchived =
      (Date.now() - location.archivedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceArchived < HARD_DELETE_GRACE_DAYS) {
      const daysRemaining = Math.ceil(
        HARD_DELETE_GRACE_DAYS - daysSinceArchived,
      );
      throw new ValidationError(
        `This location can be permanently deleted in ${daysRemaining} more day(s).`,
      );
    }

    return prisma.location.delete({ where: { id: locationId } });
  }

  /** Days remaining until hardDeleteLocation will succeed — for the UI
   *  to show a countdown and disable the button, without duplicating
   *  hardDeleteLocation's date math. Returns 0 if already eligible. */
  static getDaysUntilDeletable(archivedAt: Date | null): number {
    if (!archivedAt) return HARD_DELETE_GRACE_DAYS;
    const daysSinceArchived =
      (Date.now() - archivedAt.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(HARD_DELETE_GRACE_DAYS - daysSinceArchived));
  }
}
