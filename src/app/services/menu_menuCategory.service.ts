import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { ValidationError } from "../lib/errors";

type Tx = Prisma.TransactionClient;

export class MenuService {
  //create Menus
  static async createMenu(input: {
    name: string;
    price: number;
    quantity: number;
    isAvailable: boolean;
    categoryIds: number[];
    locationId: number;
  }) {
    return prisma.$transaction(async (tx: Tx) => {
      const menu = await tx.menu.create({
        data: { name: input.name, price: input.price, assetUrl: "" },
      });

      await tx.menuMenuCategory.createMany({
        data: input.categoryIds.map((menuCategoryId) => ({
          menuId: menu.id,
          menuCategoryId,
        })),
      });

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
        price: menu.price,
        category: categoryNameByMenuId.get(menu.id) ?? "Uncategorized",
        imageUrl: menu.assetUrl || null,
        stockQuantity: stock?.quantity ?? 0,
        isManuallyDisabled: stock?.isManuallyDisabled ?? false,
      };
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
