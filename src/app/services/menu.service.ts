import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import {
  MENU_CATEGORY_ORDER,
  MenuCategoryService,
} from "./menuCategory.service";
import { NotFoundError, ValidationError } from "../lib/errors";
import { getFileStorageService } from "../lib/storage/getFileStorageService";
import { isMenuListed } from "../lib/menu/menuOrderability";
import { menuDeletionMode, type MenuDeletionMode } from "../lib/menu/menuDeletion";
import {
  companyMenuWhere,
  MenuLocationService,
} from "./menuLocation.service";
import { firstUnownedId } from "../lib/access/ownership";
import { mainImageUrl, toMenuImages } from "../lib/storage/assetUrl";
import {
  MENU_IMAGES_MESSAGES,
  checkImageSlots,
  planMenuImages,
} from "../lib/menu/menuImagePlan";
import type { MenuImageSlot } from "../lib/menu/menuImageSlots";
import { removeStoredFiles } from "../lib/storage/removeStoredFiles";
import { MAIN_MENU_IMAGE, MENU_IMAGES } from "./menuImageQuery";
import { cleanImageUpload } from "@/app/lib/storage/cleanImageUpload";
import { popularMenuIds, popularSalesRange } from "../lib/menu/popularMenus";
import { todayInShop } from "../lib/shopDay";
import { ReportService } from "./report.service";

type Tx = Prisma.TransactionClient;

/** A category as the menu lists carry it — with its Myanmar name (null:
 *  customers see the English one). */
type CategoryRef = { id: number; name: string; nameMy?: string | null };

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
      .map((category) => ({
        id: category.id,
        name: category.name,
        nameMy: category.nameMy ?? null,
      })),
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
    /** Myanmar name / description (null: show the English ones). */
    nameMy: string | null;
    descriptionMy: string | null;
    quantity: number;
    isAvailable: boolean;
    categoryIds: number[];
    addonCategoryIds: number[];
    companyId: number;
    shownLocationIds: number[];
  }) {
    return prisma.$transaction(async (tx: Tx) => {
      await MenuService.assertCompanyCategories(
        tx,
        input.categoryIds,
        input.companyId,
      );
      const menu = await tx.menu.create({
        data: {
          name: input.name,
          nameMy: input.nameMy,
          price: input.price,
          description: input.description,
          descriptionMy: input.descriptionMy,
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

  /** Every category id from the client must be this company's (archived
   *  ones included — a menu may still be linked to one). The first that
   *  isn't is the same NotFoundError as one that doesn't exist. */
  private static async assertCompanyCategories(
    db: Tx,
    categoryIds: readonly number[],
    companyId: number,
  ) {
    const ids = [...new Set(categoryIds)];
    if (ids.length === 0) return;
    const owned = await db.menuCategory.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true },
    });
    const unowned = firstUnownedId(
      ids,
      owned.map((category) => category.id),
    );
    if (unowned !== null) throw new NotFoundError("Menu category", unowned);
  }

  /**
   * The menu's photos after a save (CLAUDE.md §7: at most 3, positions
   * 0..n-1, 0 = the main photo). `slots` is the FULL list in order —
   * kept photos by MenuImage id, new ones by their index in `newImages`
   * (lib/menu/menuImageSlots); a photo left out is removed.
   *
   * Storage can't roll back with a transaction (Rule 7), so: every new
   * file is checked and resized first (a bad one stops the save before
   * anything is stored), then written; then ONE transaction (the menu row
   * locked, as deleteMenu does) checks the list against the menu's own
   * photos (lib/menu/menuImagePlan — a kept id that isn't this menu's is
   * NotFoundError) and rewrites the rows; only after the commit are the
   * removed photos' files deleted. If anything fails after new files
   * were written, those files are deleted again (no orphans) and the
   * error stands. A failed file delete is logged, never thrown
   * (removeStoredFiles). The menu must be this company's — checked
   * before any upload.
   */
  static async saveMenuImages(
    menuId: number,
    companyId: number,
    slots: readonly MenuImageSlot[],
    newImages: readonly File[],
  ) {
    await MenuService.getCompanyMenu(menuId, companyId);
    const problem = checkImageSlots(slots, newImages.length);
    if (problem) throw new ValidationError(MENU_IMAGES_MESSAGES[problem], problem);

    // Checked by their content and resized to ≤ 1200px WebP without
    // metadata (never the browser's `type`) — a non-image is a
    // ValidationError, nothing stored.
    const photos = await Promise.all(
      newImages.map(async (image) =>
        cleanImageUpload(Buffer.from(await image.arrayBuffer()), "menuPhoto"),
      ),
    );
    const storage = getFileStorageService();
    const newKeys: string[] = [];
    try {
      for (const { buffer } of photos) {
        newKeys.push((await storage.upload(buffer, "menu", menuId)).key);
      }
    } catch (error) {
      await removeStoredFiles(storage, newKeys, "MenuService.saveMenuImages");
      throw error;
    }

    let removedKeys: string[];
    try {
      removedKeys = await MenuService.writeMenuImages(menuId, slots, newKeys);
    } catch (error) {
      await removeStoredFiles(storage, newKeys, "MenuService.saveMenuImages");
      throw error;
    }
    await removeStoredFiles(storage, removedKeys, "MenuService.saveMenuImages");
  }

  /** saveMenuImages' database step, in one transaction: lock the menu
   *  row, read its photos, plan the save (menuImagePlan) and rewrite the
   *  rows — deleted and created again, so a reorder never trips
   *  @@unique([menuId, position]). Same photos in the same order: no
   *  write. Returns the keys of the photos no longer kept. */
  private static async writeMenuImages(
    menuId: number,
    slots: readonly MenuImageSlot[],
    newKeys: readonly string[],
  ): Promise<string[]> {
    return prisma.$transaction(async (tx: Tx) => {
      await tx.$queryRaw`SELECT id FROM "Menu" WHERE id = ${menuId} FOR UPDATE`;
      const current = await tx.menuImage.findMany({
        where: { menuId },
        select: { id: true, imageKey: true, position: true },
      });
      const plan = planMenuImages(current, slots, newKeys);
      if (!plan.ok) {
        if (plan.code === "MENU_IMAGE_NOT_FOUND") {
          throw new NotFoundError("Menu image", plan.imageId);
        }
        throw new ValidationError(MENU_IMAGES_MESSAGES[plan.code], plan.code);
      }
      if (plan.unchanged) return [];
      await tx.menuImage.deleteMany({ where: { menuId } });
      if (plan.rows.length > 0) {
        await tx.menuImage.createMany({
          data: plan.rows.map((row) => ({ menuId, ...row })),
        });
      }
      return plan.removedKeys;
    });
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
      include: { disableLocationMenus: true, menuImages: MAIN_MENU_IMAGE },
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
      include: { menuCategory: { select: { id: true, name: true, nameMy: true } } },
      orderBy: MENU_CATEGORY_ORDER.map((order) => ({ menuCategory: order })),
    });
    // A menu can be linked to more than one category (see createMenu/
    // updateMenu's categoryIds array) — collect every one per menu
    // instead of a Map keyed by menuId, which would silently keep only
    // the last link and drop the rest.
    const categoriesByMenuId = new Map<number, CategoryRef[]>();
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
        // Myanmar name / description for customers who choose Myanmar
        // (null: the English ones show — lib/i18n/localizedText).
        nameMy: menu.nameMy,
        description: menu.description || "",
        descriptionMy: menu.descriptionMy,
        price: menu.price,
        categoryRefs,
        categories:
          categoryRefs.length > 0
            ? categoryRefs.map((category) => category.name)
            : ["Uncategorized"],
        imageUrl: mainImageUrl(menu.menuImages),
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


  /** The customer menu's "Popular" menus at this location: the
   *  best-sellers of the last POPULAR_DAYS shop days (lib/menu/
   *  popularMenus), counted by Reports' own item sales rule
   *  (ReportService.getMenuQuantitiesSold). Ids only — the counts never
   *  leave the server. The caller has already checked the location
   *  (checkMenuAccess). */
  static async getPopularMenuIds(locationId: number): Promise<number[]> {
    const sales = await ReportService.getMenuQuantitiesSold(
      locationId,
      popularSalesRange(todayInShop()),
    );
    return popularMenuIds(sales);
  }

  /** A menu's own fields + its stock at one location, as both detail
   *  reads return them (the customer / staff detail and the edit form):
   *  no stock row yet → 0 and available. */
  private static detailFields(
    menu: {
      id: number;
      name: string;
      nameMy: string | null;
      price: number;
      description: string | null;
      descriptionMy: string | null;
      /** Every photo (MENU_IMAGES). */
      menuImages: readonly { id: number; imageKey: string; position: number }[];
    },
    stock: { quantity: number; isManuallyDisabled: boolean } | null,
  ) {
    return {
      id: menu.id,
      name: menu.name,
      nameMy: menu.nameMy,
      price: menu.price,
      description: menu.description || "",
      descriptionMy: menu.descriptionMy,
      // Every photo, in order — URLs and ids, never the keys.
      images: toMenuImages(menu.menuImages),
      quantity: stock?.quantity ?? 0,
      isAvailable: !(stock?.isManuallyDisabled ?? false),
    };
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
      include: { menuImages: MENU_IMAGES },
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
      ...MenuService.detailFields(menu, stock),
      addonCategories: addonCategoryLinks
        .filter((link) => !link.addonCategory.isArchived)
        .map((link) => ({
          id: link.addonCategory.id,
          name: link.addonCategory.name,
          nameMy: link.addonCategory.nameMy,
          isRequired: link.addonCategory.isRequired,
          addons: link.addonCategory.addons.map((addon) => ({
            id: addon.id,
            name: addon.name,
            nameMy: addon.nameMy,
            price: addon.price,
            isAvailable: addon.isAvailable,
          })),
        })),
    };
  }

  /**
   * The owner's "Delete menu" (lib/menu/menuDeletion): a menu no Order
   * row references is deleted for good — its category, add-on group,
   * hidden-at, stock and menu-view rows (archived ones too), then the
   * menu, in ONE transaction; one that was ever ordered is only archived
   * (isArchived: every live list leaves it out, old orders keep its
   * name), its links, stock and view rows left as they are.
   *
   * Race guard: the menu's row is locked (SELECT … FOR UPDATE) before the
   * Order rows are counted. An order line being written at that moment
   * holds a key-share lock on the menu row (its foreign key) until it
   * commits, so the lock waits for it and the count sees it; one written
   * after the lock waits for this transaction — and after a delete its
   * foreign key fails, so no order can point at a deleted menu.
   *
   * A hard delete removes its MenuImage rows in the transaction (their
   * keys read first) and the photo files only after it commits (CLAUDE.md
   * Rule 7 — storage can't roll back); a failed file delete is logged and
   * the delete still succeeds: the rows are already gone. An archived
   * menu keeps its photos — History, receipts and order lines show them.
   */
  static async deleteMenu(
    menuId: number,
    companyId: number,
  ): Promise<{ mode: MenuDeletionMode }> {
    const { mode, imageKeys } = await prisma.$transaction(async (tx: Tx) => {
      await MenuService.findCompanyMenu(tx, menuId, companyId);
      await tx.$queryRaw`SELECT id FROM "Menu" WHERE id = ${menuId} FOR UPDATE`;

      const orderCount = await tx.order.count({ where: { menuId } });
      const mode = menuDeletionMode(orderCount);
      if (mode === "archive") {
        await tx.menu.update({ where: { id: menuId }, data: { isArchived: true } });
        return { mode, imageKeys: [] };
      }

      await tx.menuMenuCategory.deleteMany({ where: { menuId } });
      await tx.menuAddonCategories.deleteMany({ where: { menuId } });
      await tx.disableLocationMenus.deleteMany({ where: { menuId } });
      await tx.menuStock.deleteMany({ where: { menuId } });
      // Its view counts too (MenuViewService) — an archived menu keeps
      // them, like its order history.
      await tx.menuViewSeen.deleteMany({ where: { menuId } });
      await tx.menuViewDaily.deleteMany({ where: { menuId } });
      const images = await tx.menuImage.findMany({
        where: { menuId },
        select: { imageKey: true },
      });
      await tx.menuImage.deleteMany({ where: { menuId } });
      await tx.menu.delete({ where: { id: menuId } });
      return { mode, imageKeys: images.map((image) => image.imageKey) };
    });

    await removeStoredFiles(
      getFileStorageService(),
      imageKeys,
      "MenuService.deleteMenu",
    );
    return { mode };
  }

  /** Chain lookup — the menu, if it belongs to this company (scoped
   *  through its categories, as getMenus and the add-on list do).
   *  Throws NotFoundError otherwise, so an id from another company is
   *  indistinguishable from one that doesn't exist. */
  static async getCompanyMenu(menuId: number, companyId: number) {
    return MenuService.findCompanyMenu(prisma, menuId, companyId);
  }

  /** getCompanyMenu with any client — the plain one, or a transaction's. */
  private static async findCompanyMenu(
    db: Tx,
    menuId: number,
    companyId: number,
  ) {
    const menu = await db.menu.findFirst({
      where: { id: menuId, ...companyMenuWhere(companyId) },
      select: { id: true, name: true },
    });
    if (!menu) throw new NotFoundError("Menu", menuId);
    return menu;
  }

  /** The Backoffice edit form's data — null (the page's "Menu not
   *  found") for a menu that isn't this company's. */
  static async getMenuById(
    menuId: number,
    companyId: number,
    locationId: number,
  ) {
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, ...companyMenuWhere(companyId) },
      include: { menuImages: MENU_IMAGES },
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
      ...MenuService.detailFields(menu, stock),
      categoryIds: categoryLinks.map((link) => link.menuCategoryId),
      addonCategoryIds: addonCategoryLinks.map((link) => link.addonCategoryId),
    };
  }
  static async updateMenu(
    menuId: number,
    input: {
      name: string;
      price: number;
      quantity: number;
      description?: string;
      /** Myanmar name / description (null: show the English ones). */
      nameMy: string | null;
      descriptionMy: string | null;
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
      // The menu and every category it's put in must be this company's.
      await MenuService.findCompanyMenu(tx, menuId, input.companyId);
      await MenuService.assertCompanyCategories(
        tx,
        input.categoryIds,
        input.companyId,
      );

      const menu = await tx.menu.update({
        where: { id: menuId },
        data: {
          name: input.name,
          nameMy: input.nameMy,
          price: input.price,
          description: input.description,
          descriptionMy: input.descriptionMy,
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
