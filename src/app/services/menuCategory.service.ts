import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { ValidationError } from "../lib/errors";

type Tx = Prisma.TransactionClient;

export class MenuCategoryService {
  static async getMenuCategories(companyId: number) {
    return prisma.menuCategory.findMany({
      where: { companyId, isArchived: false },
      orderBy: { id: "asc" },
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
      const category = await tx.menuCategory.create({
        data: { name, companyId },
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
          where: {
            menuCategoryId: id,
            locationId: input.locationId,
            isArchived: false,
          },
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
  static async getMenuCategoriesWithCounts(
    companyId: number,
    locationId: number,
  ) {
    const categories = await prisma.menuCategory.findMany({
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
        disableLocationMenuCategories: {
          where: { locationId, isArchived: false },
        },
      },
    });

    return categories.map((category) => ({
      ...category,
      isEnabledAtLocation: category.disableLocationMenuCategories.length === 0,
    }));
  }
}
