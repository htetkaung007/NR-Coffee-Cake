import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import {
  MENU_CATEGORY_ORDER,
  MenuCategoryService,
} from "./menuCategory.service";
import { NotFoundError } from "../lib/errors";
import { getFileStorageService } from "../lib/storage/getFileStorageService";
import { isMenuListed } from "../lib/menu/menuOrderability";
import { MenuLocationService } from "./menuLocation.service";

type Tx = Prisma.TransactionClient;

type CategoryRef = { id: number; name: string };

/** getMenusForLocation's list, pure (unit-tested): only menus LISTED
 *  here (isMenuListed — not hidden at the location, in at least one
 *  category visible here), each keeping only its visible categories, in
 *  category order (first visible category's position, then id); plus
 *  the visible categories that hold at least one of them, in company
 *  order. Exported for its tests only. */
export function listMenusAtLocation<
  Menu extends { id: number; isHiddenHere: boolean; categoryRefs: CategoryRef[] },
>(menus: readonly Menu[], visibleCategories: readonly CategoryRef[]) {
  const positionById = new Map(
    visibleCategories.map((category, index) => [category.id, index]),
  );

  const listed = menus
    .map((menu) => {
      const visibleRefs = menu.categoryRefs.filter((category) =>
        positionById.has(category.id),
      );
      return {
        menu: {
          ...menu,
          categoryRefs: visibleRefs,
          categories: visibleRefs.map((category) => category.name),
        },
        // categoryRefs is already in company order, so the first one
        // is the menu's earliest visible category.
        position:
          visibleRefs.length > 0 ? positionById.get(visibleRefs[0].id)! : -1,
      };
    })
    .filter(({ menu }) =>
      isMenuListed({
        isArchived: false, // getMenus loads live menus only
        isDisabledHere: menu.isHiddenHere,
        hasVisibleCategory: menu.categoryRefs.length > 0,
      }),
    )
    .sort((a, b) => a.position - b.position || a.menu.id - b.menu.id)
    .map((entry) => entry.menu);

  const usedIds = new Set(
    listed.flatMap((menu) => menu.categoryRefs.map((ref) => ref.id)),
  );
  return {
    menus: listed,
    categories: visibleCategories
      .filter((category) => usedIds.has(category.id))
      .map((category) => ({ id: category.id, name: category.name })),
  };
}

export class MenuService {
  /** Creates the menu, its category/add-on links and where it shows
   *  (MenuLocationService.setMenuLocations) in one transaction: a stock
   *  row with the starting `quantity` at every shown location, a hide
   *  row at every other active location. */
  static async createMenu(input: {
    name: string;
    price: number;
    description?: string;
    quantity: number;
    isAvailable: boolean;
    categoryIds: number[];
    addonCategoryIds: number[];
    companyId: number;
    shownLocationIds: number[];
  }) {
    return prisma.$transaction(async (tx: Tx) => {
      const menu = await tx.menu.create({
        data: {
          name: input.name,
          price: input.price,
          assetUrl: "",
          description: input.description,
        },
      });

      await tx.menuMenuCategory.createMany({
        data: input.categoryIds.map((menuCategoryId) => ({
          menuId: menu.id,
          menuCategoryId,
        })),
      });

      if (input.addonCategoryIds.length > 0) {
        await tx.menuAddonCategories.createMany({
          data: input.addonCategoryIds.map((addonCategoryId) => ({
            menuId: menu.id,
            addonCategoryId,
          })),
        });
      }

      await MenuLocationService.setMenuLocations(tx, {
        menuId: menu.id,
        companyId: input.companyId,
        shownLocationIds: input.shownLocationIds,
        startingStock: input.quantity,
      });
      // The form's "available" switch starts every new stock row (they
      // are all this menu's — it was created just above).
      if (!input.isAvailable) {
        await tx.menuStock.updateMany({
          where: { menuId: menu.id },
          data: { isManuallyDisabled: true },
        });
      }

      return menu;
    });
  }

  /** Sets assetUrl after an image has been uploaded to storage — kept as
   *  its own step (see createMenu's comment on why it's not transactional). */
  static async setMenuAsset(menuId: number, url: string) {
    return prisma.menu.update({
      where: { id: menuId },
      data: { assetUrl: url },
    });
  }

  /** A new photo for a saved menu: upload it to file storage, then store
   *  its URL (setMenuAsset) — after the menu's own DB write, never inside
   *  its transaction (an object-store PUT can't be rolled back; CLAUDE.md
   *  Rule 7). */
  static async saveMenuImage(menuId: number, image: File) {
    const storage = getFileStorageService();
    const { url } = await storage.upload(
      Buffer.from(await image.arrayBuffer()),
      image.type,
      "menu",
      menuId,
    );
    await MenuService.setMenuAsset(menuId, url);
  }

  static async getMenus(companyId: number) {
    const categories = await MenuCategoryService.getMenuCategories(companyId);
    const categoryIds = categories.map((category) => category.id);

    const links = await prisma.menuMenuCategory.findMany({
      where: { menuCategoryId: { in: categoryIds } },
    });
    const menuIds = links.map((link) => link.menuId);

    return prisma.menu.findMany({
      where: { id: { in: menuIds }, isArchived: false },
      include: { disableLocationMenus: true },
    });
  }

  static async getMenusWithDetails(companyId: number, locationId: number) {
    const menus = await MenuService.getMenus(companyId);
    const menuIds = menus.map((menu) => menu.id);

    // In the company category order, so each menu's own category list
    // (and anything derived from it) follows MENU_CATEGORY_ORDER too.
    const categoryLinks = await prisma.menuMenuCategory.findMany({
      where: {
        menuId: { in: menuIds },
        isArchived: false,
        menuCategory: { isArchived: false },
      },
      include: { menuCategory: { select: { id: true, name: true } } },
      orderBy: MENU_CATEGORY_ORDER.map((order) => ({ menuCategory: order })),
    });
    // A menu can be linked to more than one category (see createMenu/
    // updateMenu's categoryIds array) — collect every one per menu
    // instead of a Map keyed by menuId, which would silently keep only
    // the last link and drop the rest.
    const categoriesByMenuId = new Map<number, { id: number; name: string }[]>();
    for (const link of categoryLinks) {
      const categories = categoriesByMenuId.get(link.menuId) ?? [];
      categories.push(link.menuCategory);
      categoriesByMenuId.set(link.menuId, categories);
    }

    const stocks = await prisma.menuStock.findMany({
      where: { menuId: { in: menuIds }, locationId, isArchived: false },
    });
    const stockByMenuId = new Map(stocks.map((stock) => [stock.menuId, stock]));

    // Same rule getMenuDetailForCustomer uses to list a menu's add-on
    // groups (active link, group not archived) — so "has add-on groups"
    // here means "MenuDetailDialog would show at least one group".
    const addonLinks = await prisma.menuAddonCategories.findMany({
      where: {
        menuId: { in: menuIds },
        isArchived: false,
        addonCategory: { isArchived: false },
      },
      select: { menuId: true },
    });
    const menuIdsWithAddons = new Set(addonLinks.map((link) => link.menuId));

    return menus.map((menu) => {
      const stock = stockByMenuId.get(menu.id);
      const categoryRefs = categoriesByMenuId.get(menu.id) ?? [];
      return {
        id: menu.id,
        name: menu.name,
        description: menu.description || "",
        price: menu.price,
        categoryRefs,
        categories:
          categoryRefs.length > 0
            ? categoryRefs.map((category) => category.name)
            : ["Uncategorized"],
        imageUrl: menu.assetUrl || null,
        stockQuantity: stock?.quantity ?? 0,
        isManuallyDisabled: stock?.isManuallyDisabled ?? false,
        // An active DisableLocationMenus row here. The Backoffice list
        // still shows the menu ("Hidden here"); getMenusForLocation —
        // what customers and the staff POS see — leaves it out.
        isHiddenHere: menu.disableLocationMenus.some(
          (row) => row.locationId === locationId && !row.isArchived,
        ),
        hasAddonGroups: menuIdsWithAddons.has(menu.id),
      };
    });
  }

  /** What customers (QR scan, view-only menu) and staff (New Order)
   *  can order from at this location — the same list for both. These
   *  callers only ever have a locationId (from the URL / the selected
   *  location), never a companyId, so this looks the company up first.
   *
   *  Only menus LISTED here are returned — isMenuListed, the listing
   *  half of isMenuOrderable: a menu hidden at this location, or with no
   *  category visible here (MenuCategoryService.getVisibleCategories,
   *  the one category-visibility rule), is left out. A switched-off or
   *  stock-0 menu stays, shown as sold out / unavailable. Each menu keeps
   *  only its visible categories. Menus come back in category order (their first
   *  visible category's position, then id), and `categories` is the tab
   *  list in company order — the visible categories that hold at least
   *  one of these menus — so clients render it as-is, never re-sorted.
   *  Each menu's `categoryRefs` / `categories` are its visible ones only. */
  static async getMenusForLocation(locationId: number) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, isArchived: false },
    });
    if (!location) return { menus: [], categories: [] };

    const [menus, visibleCategories] = await Promise.all([
      MenuService.getMenusWithDetails(location.companyId, locationId),
      MenuCategoryService.getVisibleCategories(location.companyId, locationId),
    ]);
    return listMenusAtLocation(menus, visibleCategories);
  }

  /** Customer-facing detail view — full nested addon data (category
   *  name, isRequired, each addon's name/price/isAvailable), unlike
   *  getMenuById below which only returns bare addonCategoryIds (that
   *  one feeds the backoffice edit form's checkbox picker, which
   *  already has the full AddonCategories list loaded separately).
   *  Archived addons are filtered out; an unavailable-but-not-archived
   *  addon is still shown (greyed out client-side) so a customer can
   *  see it exists and isn't just missing. */
  static async getMenuDetailForCustomer(menuId: number, locationId: number) {
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, isArchived: false },
    });
    if (!menu) return null;

    const stock = await prisma.menuStock.findFirst({
      where: { menuId, locationId },
    });

    const addonCategoryLinks = await prisma.menuAddonCategories.findMany({
      where: { menuId, isArchived: false },
      include: {
        addonCategory: {
          include: {
            addons: { where: { isArchived: false }, orderBy: { id: "asc" } },
          },
        },
      },
    });

    return {
      id: menu.id,
      name: menu.name,
      price: menu.price,
      description: menu.description || "",
      imageUrl: menu.assetUrl || null,
      quantity: stock?.quantity ?? 0,
      isAvailable: !(stock?.isManuallyDisabled ?? false),
      addonCategories: addonCategoryLinks
        .filter((link) => !link.addonCategory.isArchived)
        .map((link) => ({
          id: link.addonCategory.id,
          name: link.addonCategory.name,
          isRequired: link.addonCategory.isRequired,
          addons: link.addonCategory.addons.map((addon) => ({
            id: addon.id,
            name: addon.name,
            price: addon.price,
            isAvailable: addon.isAvailable,
          })),
        })),
    };
  }

  /** Chain lookup — the menu, if it belongs to this company (scoped
   *  through its categories, as getMenus and the add-on list do).
   *  Throws NotFoundError otherwise, so an id from another company is
   *  indistinguishable from one that doesn't exist. */
  static async getCompanyMenu(menuId: number, companyId: number) {
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        isArchived: false,
        menuMenuCategory: { some: { menuCategory: { companyId } } },
      },
      select: { id: true, name: true },
    });
    if (!menu) throw new NotFoundError("Menu", menuId);
    return menu;
  }

  static async getMenuById(menuId: number, locationId: number) {
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, isArchived: false },
    });
    if (!menu) return null;

    const categoryLinks = await prisma.menuMenuCategory.findMany({
      where: { menuId, isArchived: false },
    });

    const addonCategoryLinks = await prisma.menuAddonCategories.findMany({
      where: { menuId, isArchived: false },
    });

    const stock = await prisma.menuStock.findFirst({
      where: { menuId, locationId },
    });

    return {
      id: menu.id,
      name: menu.name,
      price: menu.price,
      description: menu.description || "",
      imageUrl: menu.assetUrl || null,
      categoryIds: categoryLinks.map((link) => link.menuCategoryId),
      addonCategoryIds: addonCategoryLinks.map((link) => link.addonCategoryId),
      quantity: stock?.quantity ?? 0,
      isAvailable: !(stock?.isManuallyDisabled ?? false),
    };
  }
  static async updateMenu(
    menuId: number,
    input: {
      name: string;
      price: number;
      quantity: number;
      description?: string;
      isAvailable: boolean;
      categoryIds: number[];
      addonCategoryIds: number[];
      /** The selected location — the only one whose stock this edits. */
      locationId: number;
      companyId: number;
      shownLocationIds: number[];
    },
  ) {
    return prisma.$transaction(async (tx: Tx) => {
      const menu = await tx.menu.update({
        where: { id: menuId },
        data: {
          name: input.name,
          price: input.price,
          description: input.description,
        },
      });

      await tx.menuMenuCategory.deleteMany({ where: { menuId } });
      await tx.menuMenuCategory.createMany({
        data: input.categoryIds.map((menuCategoryId) => ({
          menuId,
          menuCategoryId,
        })),
      });

      await tx.menuAddonCategories.deleteMany({ where: { menuId } });
      if (input.addonCategoryIds.length > 0) {
        await tx.menuAddonCategories.createMany({
          data: input.addonCategoryIds.map((addonCategoryId) => ({
            menuId,
            addonCategoryId,
          })),
        });
      }

      // Where it shows first (a newly shown location gets a stock row at
      // 0), then this location's own stock, as before.
      await MenuLocationService.setMenuLocations(tx, {
        menuId,
        companyId: input.companyId,
        shownLocationIds: input.shownLocationIds,
      });

      await tx.menuStock.upsert({
        where: {
          menuId_locationId: { menuId, locationId: input.locationId },
        },
        update: {
          quantity: input.quantity,
          isManuallyDisabled: !input.isAvailable,
        },
        create: {
          menuId,
          locationId: input.locationId,
          quantity: input.quantity,
          isManuallyDisabled: !input.isAvailable,
        },
      });

      return menu;
    });
  }
}
