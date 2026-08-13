import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { ValidationError } from "../lib/errors";

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

  static async getMenuCategories(companyId: number) {
    return prisma.menuCategory.findMany({
      where: { companyId, isArchived: false },
      orderBy: { id: "asc" },
    });
  }
  static async createMenuCategory(companyId: number, name: string) {
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

    return prisma.menuCategory.create({
      data: { name, companyId },
    });
  }
  static async getMenuCategoriesWithCounts(companyId: number) {
    return prisma.menuCategory.findMany({
      where: { companyId, isArchived: false },
      orderBy: { id: "asc" },
      include: {
        _count: {
          select: {
            menuMenuCategory: {
              where: { isArchived: false, menu: { isArchived: false } },
            },
          },
        },
      },
    });
  }

  static async getMenus(companyId: number) {
    const categories = await MenuService.getMenuCategories(companyId);
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
    const categoryNameByMenuId = new Map(
      categoryLinks.map((link) => [link.menuId, link.menuCategory.name]),
    );

    const stocks = await prisma.menuStock.findMany({
      where: { menuId: { in: menuIds }, locationId, isArchived: false },
    });
    const stockByMenuId = new Map(stocks.map((stock) => [stock.menuId, stock]));

    return menus.map((menu) => {
      const stock = stockByMenuId.get(menu.id);
      return {
        id: menu.id,
        name: menu.name,
        description: menu.description || "",
        price: menu.price,
        category: categoryNameByMenuId.get(menu.id) ?? "Uncategorized",
        imageUrl: menu.assetUrl || null,
        stockQuantity: stock?.quantity ?? 0,
        isManuallyDisabled: stock?.isManuallyDisabled ?? false,
      };
    });
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
