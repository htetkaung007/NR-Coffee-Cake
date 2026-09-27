import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { ValidationError } from "../lib/errors";

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

  /** Rename a category, and flip whether it's shown at this location —
   *  toggling a DisableLocationMenuCategories row rather than a column on
   *  MenuCategory itself, since "shown or not" is a per-location setting,
   *  not a property of the category. */
  static async updateMenuCategory(
    id: number,
    input: { name: string; locationId: number; isEnabled: boolean },
  ) {
    const category = await prisma.menuCategory.findFirst({
      where: { id, isArchived: false },
    });
    if (!category) {
      throw new ValidationError("Menu category not found.");
    }

    const nameTaken = await prisma.menuCategory.findFirst({
      where: {
        id: { not: id },
        companyId: category.companyId,
        isArchived: false,
        name: { equals: input.name, mode: "insensitive" },
      },
    });
    if (nameTaken) {
      throw new ValidationError(
        `"${input.name}" already exists as a category.`,
      );
    }

    return prisma.$transaction(async (tx: Tx) => {
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

      return updated;
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
