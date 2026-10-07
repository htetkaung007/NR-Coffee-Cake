import { prisma } from "../utils/prisma";
import { Prisma } from "../../../prisma/generated/client";
import { AppError, NotFoundError, ValidationError } from "../lib/errors";
import {
  groupCategoryMenus,
  planCategoryMenuRemoval,
} from "../lib/categoryMenus";

type Tx = Prisma.TransactionClient;

/** THE category display order — one company-wide order (MenuCategory.
 *  sortOrder, lower first; ties by id, which also keeps rows created
 *  before sortOrder existed in creation order). Every category list in
 *  the app — customer menu tabs, staff order screen, menu form chips,
 *  the Backoffice list — is ordered with this, never its own orderBy. */
export const MENU_CATEGORY_ORDER: Prisma.MenuCategoryOrderByWithRelationInput[] =
  [{ sortOrder: "asc" }, { id: "asc" }];

/** An ACTIVE "hidden at this location" row. Re-enabling a category
 *  archives its row (see updateMenuCategory), so an archived row means
 *  "shown again" — never match on locationId alone. */
function activeDisableRow(locationId: number) {
  return { locationId, isArchived: false };
}

/** THE visibility rule: the company's non-archived categories that have
 *  no active disable row at this location. */
function visibleAtLocation(
  companyId: number,
  locationId: number,
): Prisma.MenuCategoryWhereInput {
  return {
    companyId,
    isArchived: false,
    disableLocationMenuCategories: { none: activeDisableRow(locationId) },
  };
}

/** How many live menus a category holds — the "N items" count. */
const liveMenuCount = {
  _count: {
    select: {
      menuMenuCategory: {
        where: { isArchived: false, menu: { isArchived: false } },
      },
    },
  },
} satisfies Prisma.MenuCategoryInclude;

/** Merges a new order for the categories visible at one location into
 *  the company-wide order: every category hidden at that location keeps
 *  its slot, and the visible ones fill the remaining slots in their new
 *  order — so reordering at one location never changes where the
 *  categories it can't see sit relative to each other. Pure; exported
 *  for testing. `orderedVisibleIds` must hold exactly the visible ids
 *  found in `companyOrder`. */
export function mergeIntoCompanyOrder(
  companyOrder: readonly number[],
  orderedVisibleIds: readonly number[],
): number[] {
  const visibleIds = new Set(orderedVisibleIds);
  let nextVisible = 0;
  return companyOrder.map((id) =>
    visibleIds.has(id) ? orderedVisibleIds[nextVisible++] : id,
  );
}

export class MenuCategoryService {
  static async getMenuCategories(companyId: number) {
    return prisma.menuCategory.findMany({
      where: { companyId, isArchived: false },
      orderBy: MENU_CATEGORY_ORDER,
    });
  }

  /** The categories customers and staff see at this location, in the
   *  company order, each with its "N items" count. The one place the
   *  "which categories are visible here" rule is applied. */
  static async getVisibleCategories(companyId: number, locationId: number) {
    return prisma.menuCategory.findMany({
      where: visibleAtLocation(companyId, locationId),
      orderBy: MENU_CATEGORY_ORDER,
      include: liveMenuCount,
    });
  }

  /** The complement of getVisibleCategories — categories hidden at this
   *  location (an active disable row), in the company order. */
  static async getHiddenCategories(companyId: number, locationId: number) {
    return prisma.menuCategory.findMany({
      where: {
        companyId,
        isArchived: false,
        disableLocationMenuCategories: { some: activeDisableRow(locationId) },
      },
      orderBy: MENU_CATEGORY_ORDER,
      include: liveMenuCount,
    });
  }

  /** Every category's menus for the categories page (lib/categoryMenus:
   *  status at this location, other-category counts), with four queries
   *  for the whole page: the company's active links (link, menu and
   *  category live — the same set "N items" counts), the stock rows and
   *  hidden-menu rows here, and the categories visible here. */
  static async getCategoryMenus(companyId: number, locationId: number) {
    const links = await prisma.menuMenuCategory.findMany({
      where: {
        isArchived: false,
        menu: { isArchived: false },
        menuCategory: { companyId, isArchived: false },
      },
      select: {
        menuId: true,
        menuCategoryId: true,
        menu: { select: { name: true, assetUrl: true } },
      },
    });
    const menuIds = [...new Set(links.map((link) => link.menuId))];

    const [stocks, hiddenRows, visibleCategories] = await Promise.all([
      prisma.menuStock.findMany({
        where: { menuId: { in: menuIds }, locationId, isArchived: false },
        select: { menuId: true, quantity: true, isManuallyDisabled: true },
      }),
      prisma.disableLocationMenus.findMany({
        where: { menuId: { in: menuIds }, locationId, isArchived: false },
        select: { menuId: true },
      }),
      prisma.menuCategory.findMany({
        where: visibleAtLocation(companyId, locationId),
        select: { id: true },
      }),
    ]);

    return groupCategoryMenus({
      links,
      visibleCategoryIds: new Set(visibleCategories.map((category) => category.id)),
      stockByMenuId: new Map(stocks.map((stock) => [stock.menuId, stock])),
      hiddenMenuIds: new Set(hiddenRows.map((row) => row.menuId)),
    });
  }

  static async createMenuCategory(
    companyId: number,
    name: string,
    locationId: number,
    isEnabled: boolean,
  ) {
    const existing = await prisma.menuCategory.findFirst({
      where: {
        companyId,
        isArchived: false,
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (existing) {
      throw new ValidationError(`"${name}" already exists as a category.`);
    }

    return prisma.$transaction(async (tx: Tx) => {
      // New categories go last in the company order.
      const { _max } = await tx.menuCategory.aggregate({
        where: { companyId, isArchived: false },
        _max: { sortOrder: true },
      });

      const category = await tx.menuCategory.create({
        data: { name, companyId, sortOrder: (_max.sortOrder ?? 0) + 1 },
      });

      if (!isEnabled) {
        await tx.disableLocationMenuCategories.create({
          data: { locationId, menuCategoryId: category.id },
        });
      }

      return category;
    });
  }

  /** Rename a category, flip whether it's shown at this location —
   *  toggling a DisableLocationMenuCategories row rather than a column on
   *  MenuCategory itself, since "shown or not" is a per-location setting,
   *  not a property of the category — and take menus out of it
   *  (`removeMenuIds`), all in ONE transaction: any refusal leaves
   *  nothing changed.
   *
   *  Removing (planCategoryMenuRemoval): every id must be in THIS
   *  category, and no menu may end with no category. Only this
   *  category's links go, deleted the way MenuService.updateMenu
   *  replaces a menu's links; other categories, the menus, stock and
   *  orders are never touched. Serializable, so two saves removing a
   *  menu's last two categories at once can't both pass the check — the
   *  second fails and asks to try again. */
  static async updateMenuCategory(
    id: number,
    input: {
      companyId: number;
      name: string;
      locationId: number;
      isEnabled: boolean;
      removeMenuIds: readonly number[];
    },
  ) {
    const category = await prisma.menuCategory.findFirst({
      where: { id, companyId: input.companyId, isArchived: false },
    });
    if (!category) throw new NotFoundError("Menu category", id);

    const nameTaken = await prisma.menuCategory.findFirst({
      where: {
        id: { not: id },
        companyId: input.companyId,
        isArchived: false,
        name: { equals: input.name, mode: "insensitive" },
      },
    });
    if (nameTaken) {
      throw new ValidationError(
        `"${input.name}" already exists as a category.`,
      );
    }

    try {
      return await prisma.$transaction(
        async (tx: Tx) => {
          const updated = await tx.menuCategory.update({
            where: { id },
            data: { name: input.name },
          });

          const existingDisableRow =
            await tx.disableLocationMenuCategories.findFirst({
              where: { menuCategoryId: id, ...activeDisableRow(input.locationId) },
            });

          if (input.isEnabled && existingDisableRow) {
            await tx.disableLocationMenuCategories.update({
              where: { id: existingDisableRow.id },
              data: { isArchived: true },
            });
          } else if (!input.isEnabled && !existingDisableRow) {
            await tx.disableLocationMenuCategories.create({
              data: { locationId: input.locationId, menuCategoryId: id },
            });
          }

          if (input.removeMenuIds.length > 0) {
            await MenuCategoryService.removeMenus(
              tx,
              id,
              input.companyId,
              input.removeMenuIds,
            );
          }

          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw new AppError(
          "Someone else changed these menus at the same time. Try again.",
          "CONFLICT",
        );
      }
      throw error;
    }
  }

  /** updateMenuCategory's removal step, inside its transaction. */
  private static async removeMenus(
    tx: Tx,
    menuCategoryId: number,
    companyId: number,
    removeMenuIds: readonly number[],
  ) {
    const links = await tx.menuMenuCategory.findMany({
      where: {
        menuId: { in: [...removeMenuIds] },
        isArchived: false,
        menu: { isArchived: false },
        menuCategory: { companyId, isArchived: false },
      },
      select: { menuId: true, menuCategoryId: true, menu: { select: { name: true } } },
    });
    const plan = planCategoryMenuRemoval({ menuCategoryId, removeMenuIds, links });
    if (plan.invalidIds.length > 0) {
      throw new ValidationError(
        "Some menus are no longer in this category. Refresh and try again.",
      );
    }
    if (plan.orphanedMenuIds.length > 0) {
      const name = links.find((link) => link.menuId === plan.orphanedMenuIds[0])!
        .menu.name;
      throw new ValidationError(`${name} must stay in at least one category.`);
    }

    await tx.menuMenuCategory.deleteMany({
      where: { menuCategoryId, menuId: { in: plan.removeMenuIds } },
    });
  }

  /** Saves a new order for the categories visible at this location.
   *  `orderedVisibleIds` must be exactly the visible ids (no missing,
   *  extra or duplicate ids). Hidden categories keep their slots (see
   *  mergeIntoCompanyOrder); every non-archived category of the company
   *  is renumbered 1..n in one transaction, so the stored order never
   *  has gaps or ties. Returns the visible ids in their saved order. */
  static async reorder(
    companyId: number,
    locationId: number,
    orderedVisibleIds: number[],
  ) {
    return prisma.$transaction(async (tx: Tx) => {
      const [companyCategories, visibleCategories] = await Promise.all([
        tx.menuCategory.findMany({
          where: { companyId, isArchived: false },
          orderBy: MENU_CATEGORY_ORDER,
          select: { id: true },
        }),
        tx.menuCategory.findMany({
          where: visibleAtLocation(companyId, locationId),
          select: { id: true },
        }),
      ]);

      const visibleIds = new Set(visibleCategories.map((c) => c.id));
      const requestedIds = new Set(orderedVisibleIds);
      const isExactMatch =
        requestedIds.size === orderedVisibleIds.length &&
        requestedIds.size === visibleIds.size &&
        orderedVisibleIds.every((id) => visibleIds.has(id));
      if (!isExactMatch) {
        throw new ValidationError(
          "The category list changed while you were reordering. Refresh and try again.",
        );
      }

      const merged = mergeIntoCompanyOrder(
        companyCategories.map((c) => c.id),
        orderedVisibleIds,
      );
      for (const [index, id] of merged.entries()) {
        await tx.menuCategory.update({
          where: { id },
          data: { sortOrder: index + 1 },
        });
      }

      return orderedVisibleIds;
    });
  }

  /** Sorts only the categories visible at this location by name (case-
   *  insensitive, locale-aware), then saves through reorder — so hidden
   *  categories keep their slots exactly as with a manual reorder. */
  static async sortAlphabetically(companyId: number, locationId: number) {
    const visible = await MenuCategoryService.getVisibleCategories(
      companyId,
      locationId,
    );
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    const orderedIds = [...visible]
      .sort((a, b) => collator.compare(a.name, b.name) || a.id - b.id)
      .map((category) => category.id);

    return MenuCategoryService.reorder(companyId, locationId, orderedIds);
  }
}
