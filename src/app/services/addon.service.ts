import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { ValidationError } from "../lib/errors";

type Tx = Prisma.TransactionClient;

/**
 * AddonCategories has no companyId in the schema (unlike MenuCategory) —
 * addon categories are shared across the whole app, not scoped per company.
 * That's an existing schema decision, kept as-is here.
 *
 * Addon categories and their addons are managed as one unit, not two
 * separate flows: you can't have an addon without a category, so create
 * and list operations both work on the pair together.
 */
export class AddonService {
  /** Merged Add-ons view: each category shown with its own addons nested
   *  underneath, instead of two separate flat lists (categories vs.
   *  addons) that the user has to mentally cross-reference. */
  static async getAddonCategoriesWithAddonsList() {
    return prisma.addonCategories.findMany({
      where: { isArchived: false },
      orderBy: { id: "asc" },
      include: {
        addons: {
          where: { isArchived: false },
          orderBy: { id: "asc" },
        },
      },
    });
  }

  /** Single category + its addons, for populating the Edit form. */
  static async getAddonCategoryWithAddons(id: number) {
    return prisma.addonCategories.findFirst({
      where: { id, isArchived: false },
      include: {
        addons: {
          where: { isArchived: false },
          orderBy: { id: "asc" },
        },
      },
    });
  }

  /** Menus already connected to this group, for populating the Edit
   *  form's "Connect to Menus" picker. */
  static async getMenuIdsForAddonCategory(addonCategoryId: number) {
    const links = await prisma.menuAddonCategories.findMany({
      where: { addonCategoryId, isArchived: false },
      select: { menuId: true },
    });
    return links.map((link) => link.menuId);
  }

  /** "Or Create Custom Add-On Option" — Group Title + its Options
   *  (name/price rows) created together in one transaction, the same way
   *  createMenu() creates a Menu and its MenuStock together. A blank price
   *  on an option means Free; the schema layer has already turned that
   *  into 0 by the time it reaches here. */
  static async createAddonCategoryWithAddons(input: {
    groupName: string;
    isRequired: boolean;
    options: { name: string; price: number }[];
    menuIds: number[];
  }) {
    const existing = await prisma.addonCategories.findFirst({
      where: {
        isArchived: false,
        name: { equals: input.groupName, mode: "insensitive" },
      },
    });
    if (existing) {
      throw new ValidationError(
        `"${input.groupName}" already exists as an addon category.`,
      );
    }

    return prisma.$transaction(async (tx: Tx) => {
      const category = await tx.addonCategories.create({
        data: { name: input.groupName, isRequired: input.isRequired },
      });

      await tx.addon.createMany({
        data: input.options.map((option) => ({
          name: option.name,
          price: option.price,
          addonCategoryId: category.id,
        })),
      });

      if (input.menuIds.length > 0) {
        await tx.menuAddonCategories.createMany({
          data: input.menuIds.map((menuId) => ({
            menuId,
            addonCategoryId: category.id,
          })),
        });
      }

      return category;
    });
  }

  /** Edit an existing Group + reconcile its Options in one transaction:
   *  an option with an `id` is an existing Addon row → update it; an
   *  option with no `id` is new (added via "+ Add Option") → create it;
   *  any existing Addon row not present in the submitted list anymore
   *  (removed via "X") → archived (soft-deleted), not hard-deleted, the
   *  same convention as the rest of the app. */
  static async updateAddonCategoryWithAddons(
    id: number,
    input: {
      groupName: string;
      isRequired: boolean;
      options: { id?: number; name: string; price: number }[];
      menuIds: number[];
    },
  ) {
    const category = await prisma.addonCategories.findFirst({
      where: { id, isArchived: false },
    });
    if (!category) {
      throw new ValidationError("Addon category not found.");
    }

    const nameTaken = await prisma.addonCategories.findFirst({
      where: {
        id: { not: id },
        isArchived: false,
        name: { equals: input.groupName, mode: "insensitive" },
      },
    });
    if (nameTaken) {
      throw new ValidationError(
        `"${input.groupName}" already exists as an addon category.`,
      );
    }

    return prisma.$transaction(async (tx: Tx) => {
      await tx.addonCategories.update({
        where: { id },
        data: { name: input.groupName, isRequired: input.isRequired },
      });

      const existingAddons = await tx.addon.findMany({
        where: { addonCategoryId: id, isArchived: false },
        select: { id: true },
      });
      const submittedIds = new Set(
        input.options.map((option) => option.id).filter(Boolean),
      );
      const removedIds = existingAddons
        .map((addon) => addon.id)
        .filter((existingId) => !submittedIds.has(existingId));

      if (removedIds.length > 0) {
        await tx.addon.updateMany({
          where: { id: { in: removedIds } },
          data: { isArchived: true },
        });
      }

      for (const option of input.options) {
        if (option.id) {
          await tx.addon.update({
            where: { id: option.id },
            data: { name: option.name, price: option.price },
          });
        } else {
          await tx.addon.create({
            data: {
              name: option.name,
              price: option.price,
              addonCategoryId: id,
            },
          });
        }
      }

      await tx.menuAddonCategories.deleteMany({
        where: { addonCategoryId: id },
      });
      if (input.menuIds.length > 0) {
        await tx.menuAddonCategories.createMany({
          data: input.menuIds.map((menuId) => ({
            menuId,
            addonCategoryId: id,
          })),
        });
      }

      return tx.addonCategories.findFirstOrThrow({
        where: { id },
        include: { addons: { where: { isArchived: false } } },
      });
    });
  }
}
