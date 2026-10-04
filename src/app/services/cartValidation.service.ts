import { prisma } from "../utils/prisma";
import { NotFoundError } from "../lib/errors";
import { isMenuOrderable } from "../lib/menuOrderability";
import {
  validateCartLines,
  type CartCatalog,
  type CartLineInput,
  type CatalogMenu,
} from "../lib/cartValidation";
import { MenuCategoryService } from "./menuCategory.service";

/**
 * The database side of the browser-cart check: loads a catalog snapshot
 * for ONE location, then hands it to validateCartLines, where every rule
 * lives (pure, unit-tested). Reads only — never writes.
 */
export class CartValidationService {
  /**
   * The catalog for just the menus in a cart, with a FIXED number of
   * queries whatever the cart size: the location, then six batched
   * queries run together (menus, stock, per-location disabled menus,
   * visible categories, category links, add-on groups with their
   * add-ons) — never one query per line.
   *
   * A menu is in the catalog only if it belongs to the location's
   * company (linked to at least one of its live categories); anything
   * else is "not sold here" and left out. It's orderable only when every
   * source allows it: not archived, not manually disabled in its stock
   * row (the staff "available" switch), not disabled at this location,
   * and in at least one category visible here. No stock row = 0 stock,
   * the same as the menu list (MenuService.getMenusWithDetails).
   *
   * Throws NotFoundError for a missing or archived location — nothing
   * can be ordered there, so there is no catalog to check against.
   */
  static async loadCatalog(
    locationId: number,
    menuIds: readonly number[],
  ): Promise<CartCatalog> {
    const location = await prisma.location.findFirst({
      where: { id: locationId, isArchived: false },
      select: { companyId: true },
    });
    if (!location) throw new NotFoundError("Location", locationId);

    const ids = [...new Set(menuIds)];
    if (ids.length === 0) return new Map();

    const [orderability, addonLinks] = await Promise.all([
      CartValidationService.loadOrderability(location.companyId, locationId, ids),
      // Same add-on groups MenuDetailDialog shows and
      // OrderSessionCartService.validateAddonSelection checks: active
      // link, group not archived, add-ons not archived.
      prisma.menuAddonCategories.findMany({
        where: {
          menuId: { in: ids },
          isArchived: false,
          addonCategory: { isArchived: false },
        },
        select: {
          menuId: true,
          addonCategory: {
            select: {
              name: true,
              isRequired: true,
              addons: {
                where: { isArchived: false },
                select: { id: true, name: true, price: true, isAvailable: true },
              },
            },
          },
        },
      }),
    ]);

    const addonGroupsByMenuId = new Map<
      number,
      (typeof addonLinks)[number]["addonCategory"][]
    >();
    for (const link of addonLinks) {
      const groups = addonGroupsByMenuId.get(link.menuId) ?? [];
      groups.push(link.addonCategory);
      addonGroupsByMenuId.set(link.menuId, groups);
    }

    const catalog = new Map<number, CatalogMenu>();
    for (const menu of orderability.menus) {
      const stock = orderability.stockByMenuId.get(menu.id);
      const groups = addonGroupsByMenuId.get(menu.id) ?? [];
      catalog.set(menu.id, {
        name: menu.name,
        price: menu.price,
        isOrderable: orderability.isOrderable(menu.id),
        stockQuantity: stock?.quantity ?? 0,
        allowedAddons: new Map(
          groups.flatMap((group) =>
            group.addons.map((addon) => [
              addon.id,
              {
                name: addon.name,
                price: addon.price,
                isAvailable: addon.isAvailable,
              },
            ]),
          ),
        ),
        requiredAddonGroups: groups
          .filter((group) => group.isRequired)
          .map((group) => ({
            name: group.name,
            addonIds: group.addons.map((addon) => addon.id),
          })),
      });
    }
    return catalog;
  }

  /**
   * Which menus this company sells at this location, and which of them can
   * be ordered — the one place the "orderable" facts are loaded (rule:
   * isMenuOrderable), shared by loadCatalog above and the reports
   * (getOrderableMenuIds). Five queries run together, however many menus:
   * menus, stock rows, per-location disabled menus, the categories visible
   * here, and menu→category links. `menuIds` limits it to those menus
   * (a cart); null means every live menu of the company (an archived menu
   * is never orderable, so it isn't loaded then).
   *
   * `menus` holds only menus linked to at least one of the company's live
   * categories — anything else is "not sold here". No stock row = not
   * manually disabled (and 0 stock, for callers that read it).
   */
  static async loadOrderability(
    companyId: number,
    locationId: number,
    menuIds: readonly number[] | null,
  ) {
    const menuFilter = menuIds ? { in: [...menuIds] } : undefined;
    const [menus, stocks, disabledHere, visibleCategories, categoryLinks] =
      await Promise.all([
        prisma.menu.findMany({
          where: menuIds
            ? { id: menuFilter }
            : {
                isArchived: false,
                menuMenuCategory: {
                  some: {
                    isArchived: false,
                    menuCategory: { companyId, isArchived: false },
                  },
                },
              },
          select: { id: true, name: true, price: true, isArchived: true },
        }),
        prisma.menuStock.findMany({
          where: { menuId: menuFilter, locationId, isArchived: false },
          select: { menuId: true, quantity: true, isManuallyDisabled: true },
        }),
        // An archived row means "enabled again", the same convention as
        // the per-location category disable rows.
        prisma.disableLocationMenus.findMany({
          where: { menuId: menuFilter, locationId, isArchived: false },
          select: { menuId: true },
        }),
        MenuCategoryService.getVisibleCategories(companyId, locationId),
        prisma.menuMenuCategory.findMany({
          where: {
            menuId: menuFilter,
            isArchived: false,
            menuCategory: { companyId, isArchived: false },
          },
          select: { menuId: true, menuCategoryId: true },
        }),
      ]);

    const stockByMenuId = new Map(stocks.map((stock) => [stock.menuId, stock]));
    const disabledMenuIds = new Set(disabledHere.map((row) => row.menuId));
    const visibleCategoryIds = new Set(visibleCategories.map((c) => c.id));
    const companyMenuIds = new Set(categoryLinks.map((link) => link.menuId));
    const visibleMenuIds = new Set(
      categoryLinks
        .filter((link) => visibleCategoryIds.has(link.menuCategoryId))
        .map((link) => link.menuId),
    );
    const soldHere = menus.filter((menu) => companyMenuIds.has(menu.id));
    const soldHereById = new Map(soldHere.map((menu) => [menu.id, menu]));
    const isOrderable = (menuId: number) => {
      const menu = soldHereById.get(menuId);
      return (
        menu !== undefined &&
        isMenuOrderable({
          isArchived: menu.isArchived,
          isManuallyDisabled: stockByMenuId.get(menuId)?.isManuallyDisabled ?? false,
          isDisabledHere: disabledMenuIds.has(menuId),
          hasVisibleCategory: visibleMenuIds.has(menuId),
        })
      );
    };

    return { menus: soldHere, stockByMenuId, visibleCategories, isOrderable };
  }

  /** The ids of every menu orderable at this location right now (see
   *  loadOrderability / isMenuOrderable), plus the categories visible
   *  here in company order — what the reports measure "slow sellers"
   *  and filter against. The caller has already checked that the
   *  location belongs to the company. */
  static async getOrderableMenus(companyId: number, locationId: number) {
    const orderability = await CartValidationService.loadOrderability(
      companyId,
      locationId,
      null,
    );
    return {
      menuIds: orderability.menus
        .filter((menu) => orderability.isOrderable(menu.id))
        .map((menu) => menu.id),
      visibleCategories: orderability.visibleCategories,
    };
  }

  /** loadCatalog for the cart's menus, then THE cart rules
   *  (validateCartLines). */
  static async validate(locationId: number, lines: readonly CartLineInput[]) {
    const catalog = await CartValidationService.loadCatalog(
      locationId,
      lines.map((line) => line.menuId),
    );
    return validateCartLines(lines, catalog);
  }
}
