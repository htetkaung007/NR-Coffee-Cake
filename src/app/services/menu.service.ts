import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { MenuCategoryService } from "./menuCategory.service";

type Tx = Prisma.TransactionClient;

export class MenuService {
  //create Menus
  static async createMenu(input: {
    name: string;
    price: number;
    description?: string;
    quantity: number;
    isAvailable: boolean;
    categoryIds: number[];
    addonCategoryIds: number[];
    locationId: number;
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

      await tx.menuStock.create({
        data: {
          menuId: menu.id,
          locationId: input.locationId,
          quantity: input.quantity,
          isManuallyDisabled: !input.isAvailable,
        },
      });

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

    const categoryLinks = await prisma.menuMenuCategory.findMany({
      where: { menuId: { in: menuIds }, isArchived: false },
      include: { menuCategory: true },
    });
    // A menu can be linked to more than one category (see createMenu/
    // updateMenu's categoryIds array) — collect every name per menu
    // instead of a Map keyed by menuId, which would silently keep only
    // the last link and drop the rest.
    const categoryNamesByMenuId = new Map<number, string[]>();
    for (const link of categoryLinks) {
      const names = categoryNamesByMenuId.get(link.menuId) ?? [];
      names.push(link.menuCategory.name);
      categoryNamesByMenuId.set(link.menuId, names);
    }

    const stocks = await prisma.menuStock.findMany({
      where: { menuId: { in: menuIds }, locationId, isArchived: false },
    });
    const stockByMenuId = new Map(stocks.map((stock) => [stock.menuId, stock]));

    return menus.map((menu) => {
      const stock = stockByMenuId.get(menu.id);
      const categories = categoryNamesByMenuId.get(menu.id) ?? [];
      return {
        id: menu.id,
        name: menu.name,
        description: menu.description || "",
        price: menu.price,
        categories: categories.length > 0 ? categories : ["Uncategorized"],
        imageUrl: menu.assetUrl || null,
        stockQuantity: stock?.quantity ?? 0,
        isManuallyDisabled: stock?.isManuallyDisabled ?? false,
      };
    });
  }

  /** Customer-facing entry point (QR scan, view-only menu) — these
   *  callers only ever have a locationId (from the URL), never a
   *  companyId, so this looks the company up first rather than asking
   *  every caller to do that join themselves. */
  static async getMenusForLocation(locationId: number) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, isArchived: false },
    });
    if (!location) return [];

    return MenuService.getMenusWithDetails(location.companyId, locationId);
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
      locationId: number;
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

  static async getMenusByCategories(categoryIds: number[]) {
    const links = await prisma.menuMenuCategory.findMany({
      where: { menuCategoryId: { in: categoryIds } },
    });
    const menuIds = links.map((link) => link.menuId);

    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds }, isArchived: false },
      include: { disableLocationMenus: true },
    });

    const disabledMenus = await prisma.disableLocationMenus.findMany({
      where: { menuId: { in: menuIds } },
    });
    const disabledMenuIds = new Set(disabledMenus.map((d) => d.menuId));

    return menus.filter((menu) => !disabledMenuIds.has(menu.id));
  }
}
