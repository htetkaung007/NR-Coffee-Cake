import { menuCardStatus, type MenuCardStatus } from "./menuCardStatus";

/** One active menu ↔ category link (link and menu not archived, the
 *  category one of the company's live ones). */
export interface MenuCategoryLink {
  menuId: number;
  menuCategoryId: number;
}

/** A menu as the categories page lists it under one category. */
export interface CategoryMenu {
  id: number;
  name: string;
  imageUrl: string | null;
  /** At the current location — menuCardStatus, the Backoffice card's. */
  status: MenuCardStatus;
  /** How many OTHER categories (any location) the menu is in. */
  otherCategoryCount: number;
  /** How many OTHER categories visible at the current location it's in. */
  otherVisibleCategoryCount: number;
}

/**
 * Every category's menus, from the company's active links plus the
 * location's facts, each list ordered by name (locale-aware, so Myanmar
 * names sort too). Pure — MenuCategoryService.getCategoryMenus loads the
 * rows with a fixed number of queries.
 */
export function groupCategoryMenus(input: {
  links: readonly (MenuCategoryLink & {
    menu: { name: string; assetUrl: string | null };
  })[];
  visibleCategoryIds: ReadonlySet<number>;
  stockByMenuId: ReadonlyMap<
    number,
    { quantity: number; isManuallyDisabled: boolean }
  >;
  hiddenMenuIds: ReadonlySet<number>;
}): Map<number, CategoryMenu[]> {
  const categoryIdsByMenu = new Map<number, Set<number>>();
  for (const link of input.links) {
    const ids = categoryIdsByMenu.get(link.menuId) ?? new Set<number>();
    ids.add(link.menuCategoryId);
    categoryIdsByMenu.set(link.menuId, ids);
  }

  const byCategory = new Map<number, CategoryMenu[]>();
  for (const link of input.links) {
    const others = [...categoryIdsByMenu.get(link.menuId)!].filter(
      (id) => id !== link.menuCategoryId,
    );
    const stock = input.stockByMenuId.get(link.menuId);
    const menus = byCategory.get(link.menuCategoryId) ?? [];
    if (menus.some((menu) => menu.id === link.menuId)) continue;
    menus.push({
      id: link.menuId,
      name: link.menu.name,
      imageUrl: link.menu.assetUrl || null,
      status: menuCardStatus({
        stockQuantity: stock?.quantity ?? 0,
        isManuallyDisabled: stock?.isManuallyDisabled ?? false,
        isHiddenHere: input.hiddenMenuIds.has(link.menuId),
      }),
      otherCategoryCount: others.length,
      otherVisibleCategoryCount: others.filter((id) =>
        input.visibleCategoryIds.has(id),
      ).length,
    });
    byCategory.set(link.menuCategoryId, menus);
  }

  const collator = new Intl.Collator(undefined, { sensitivity: "base" });
  for (const menus of byCategory.values()) {
    menus.sort((a, b) => collator.compare(a.name, b.name) || a.id - b.id);
  }
  return byCategory;
}

/**
 * What removing `removeMenuIds` from one category means, given every
 * active link of those menus (in any of the company's categories):
 * - `invalidIds`: not in this category (stale or forged) — refuse all;
 * - `orphanedMenuIds`: would end with no category at all — refuse (a
 *   menu must stay in at least one; the menu form enforces it too);
 * - `removeMenuIds`: the links to remove (deduplicated).
 * An empty list is a no-op. A menu whose other categories are all
 * hidden here may still be removed — the dialog just warns.
 */
export function planCategoryMenuRemoval(input: {
  menuCategoryId: number;
  removeMenuIds: readonly number[];
  links: readonly MenuCategoryLink[];
}) {
  const removeMenuIds = [...new Set(input.removeMenuIds)];
  const inThisCategory = new Set(
    input.links
      .filter((link) => link.menuCategoryId === input.menuCategoryId)
      .map((link) => link.menuId),
  );
  const invalidIds = removeMenuIds.filter((id) => !inThisCategory.has(id));
  const orphanedMenuIds = removeMenuIds.filter(
    (id) =>
      inThisCategory.has(id) &&
      !input.links.some(
        (link) =>
          link.menuId === id && link.menuCategoryId !== input.menuCategoryId,
      ),
  );
  return { removeMenuIds, invalidIds, orphanedMenuIds };
}

/** What a category with no menus says (row preview and dialog). */
export const NO_MENUS_TEXT =
  "No menus yet — add this category from a menu's Edit page.";

/** The row preview under a category's name: "N items · A, B, C +K more". */
export function categoryPreviewLine(menus: readonly { name: string }[]) {
  const count = `${menus.length} ${menus.length === 1 ? "item" : "items"}`;
  if (menus.length === 0) return count;
  const shown = menus
    .slice(0, 3)
    .map((menu) => menu.name)
    .join(", ");
  const more = menus.length > 3 ? ` +${menus.length - 3} more` : "";
  return `${count} · ${shown}${more}`;
}
