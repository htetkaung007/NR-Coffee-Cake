import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { planMenuLocations } from "../lib/menu/menuLocations";

type Tx = Prisma.TransactionClient;

/** A live menu of this company — scoped through its categories (Menu has
 *  no companyId), as MenuService.getMenus is. Shared with MenuService's
 *  ownership checks (getCompanyMenu, getMenuById, updateMenu). */
export function companyMenuWhere(companyId: number): Prisma.MenuWhereInput {
  return {
    isArchived: false,
    menuMenuCategory: { some: { menuCategory: { companyId } } },
  };
}

/**
 * Which locations a company-wide menu shows at. Hidden = an active
 * (isArchived false) DisableLocationMenus row for the pair; shown = no
 * such row, plus a MenuStock row there. Its own Service (not MenuService)
 * because it changes for its own reason — per-location visibility — and
 * is shared by the menu form and new-location setup.
 *
 * DisableLocationMenus has no unique (menuId, locationId), so these
 * writes read the active rows first and run inside the caller's
 * transaction — never an upsert — and never add a second active row for
 * a pair that already has one.
 */
export class MenuLocationService {
  /** Every active location of the company, and whether the menu shows
   *  there — the menu form's "Show at locations" ticks. */
  static async getMenuLocations(menuId: number, companyId: number) {
    const [locations, hiddenRows] = await Promise.all([
      prisma.location.findMany({
        where: { companyId, isArchived: false },
        orderBy: { id: "asc" },
        select: { id: true, name: true },
      }),
      prisma.disableLocationMenus.findMany({
        where: { menuId, isArchived: false },
        select: { locationId: true },
      }),
    ]);
    const hidden = new Set(hiddenRows.map((row) => row.locationId));
    return locations.map((location) => ({
      locationId: location.id,
      name: location.name,
      isShown: !hidden.has(location.id),
    }));
  }

  /**
   * Makes the menu show at exactly `shownLocationIds` among the company's
   * active locations (planMenuLocations decides; throws ValidationError
   * for none shown or a location that isn't the company's):
   * - shown: its active hide row is archived; a MenuStock row is created
   *   with `startingStock` (default 0) if missing — an existing quantity
   *   is never overwritten.
   * - not shown: ONE active hide row (an archived one is reused). The
   *   stock row stays, so showing it again brings its old stock back.
   */
  static async setMenuLocations(
    tx: Tx,
    input: {
      menuId: number;
      companyId: number;
      shownLocationIds: readonly number[];
      startingStock?: number;
    },
  ) {
    const { menuId } = input;
    const [locations, hiddenRows, stockRows] = await Promise.all([
      tx.location.findMany({
        where: { companyId: input.companyId, isArchived: false },
        select: { id: true },
      }),
      tx.disableLocationMenus.findMany({
        where: { menuId, isArchived: false },
        select: { locationId: true },
      }),
      tx.menuStock.findMany({
        where: { menuId },
        select: { locationId: true },
      }),
    ]);

    const plan = planMenuLocations({
      activeLocationIds: locations.map((location) => location.id),
      shownLocationIds: input.shownLocationIds,
      hiddenLocationIds: hiddenRows.map((row) => row.locationId),
      stockLocationIds: stockRows.map((row) => row.locationId),
    });

    if (plan.unhide.length > 0) {
      await tx.disableLocationMenus.updateMany({
        where: { menuId, locationId: { in: plan.unhide }, isArchived: false },
        data: { isArchived: true },
      });
    }

    if (plan.hide.length > 0) {
      await MenuLocationService.hideAt(tx, menuId, plan.hide);
    }

    if (plan.createStock.length > 0) {
      await tx.menuStock.createMany({
        data: plan.createStock.map((locationId) => ({
          menuId,
          locationId,
          quantity: input.startingStock ?? 0,
        })),
        skipDuplicates: true,
      });
    }

    return plan;
  }

  /**
   * A new location's starting menus, in the location's own transaction:
   * "ALL" — every live company menu shows there (a stock row at 0 each);
   * "EMPTY" — every one is hidden there (an active hide row each), to be
   * turned on from each menu's form.
   */
  static async setUpNewLocation(
    tx: Tx,
    input: { locationId: number; companyId: number; startingMenus: "ALL" | "EMPTY" },
  ) {
    const menus = await tx.menu.findMany({
      where: companyMenuWhere(input.companyId),
      select: { id: true },
    });
    if (menus.length === 0) return;

    if (input.startingMenus === "ALL") {
      await tx.menuStock.createMany({
        data: menus.map((menu) => ({
          menuId: menu.id,
          locationId: input.locationId,
          quantity: 0,
        })),
        skipDuplicates: true,
      });
    } else {
      await tx.disableLocationMenus.createMany({
        data: menus.map((menu) => ({
          menuId: menu.id,
          locationId: input.locationId,
        })),
      });
    }
  }

  /** One active hide row per location — the caller has checked none is
   *  active yet. Reuses an archived row for the pair when there is one
   *  (keeps the table from growing on every hide/show), else creates. */
  private static async hideAt(tx: Tx, menuId: number, locationIds: number[]) {
    const archivedRows = await tx.disableLocationMenus.findMany({
      where: { menuId, locationId: { in: locationIds }, isArchived: true },
      orderBy: { id: "asc" },
      select: { id: true, locationId: true },
    });
    const reusableIdByLocation = new Map<number, number>();
    for (const row of archivedRows) {
      if (!reusableIdByLocation.has(row.locationId)) {
        reusableIdByLocation.set(row.locationId, row.id);
      }
    }

    if (reusableIdByLocation.size > 0) {
      await tx.disableLocationMenus.updateMany({
        where: { id: { in: [...reusableIdByLocation.values()] } },
        data: { isArchived: false },
      });
    }
    const toCreate = locationIds.filter((id) => !reusableIdByLocation.has(id));
    if (toCreate.length > 0) {
      await tx.disableLocationMenus.createMany({
        data: toCreate.map((locationId) => ({ menuId, locationId })),
      });
    }
  }
}
