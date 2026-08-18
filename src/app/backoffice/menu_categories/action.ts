"use server";

import {
  toSafeResult,
  validateWith,
  toActionResult,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import {
  CreateMenuCategoryInput,
  createMenuCategorySchema,
  UpdateMenuCategoryInput,
  updateMenuCategorySchema,
} from "@/app/lib/schemas/menu_menuCategorySchema";
import { getSessionContext } from "@/app/lib/session";
import { AppService, MenuService } from "@/app/services";
import { revalidatePath } from "next/cache";

const CreateMenuCategory = toSafeResult(
  async (input: CreateMenuCategoryInput) => {
    const { companyId, userId } = await getSessionContext();
    if (!companyId || !userId) {
      throw new AppError(
        "You must be signed in to create a category.",
        "UNAUTHORIZED",
      );
    }

    const selectedLocation = await AppService.getSelectedLocation(userId);
    if (!selectedLocation) {
      throw new AppError(
        "No location selected. Please choose a location first.",
        "VALIDATION",
      );
    }

    return MenuService.createMenuCategory(
      companyId,
      input.name,
      selectedLocation.locationId,
      input.isEnabled,
    );
  },
);

export async function createMenuCategoryAction(input: unknown) {
  const result = await validateWith(
    createMenuCategorySchema,
    input,
  ).asyncAndThen(CreateMenuCategory);

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    // The new category needs to show up in both places that read
    // getMenuCategories: the menu list page and the create-menu form.
    revalidatePath("/backoffice/menus");
    revalidatePath("/backoffice/menus/new");
    revalidatePath("/backoffice/menu_categories");
  }

  return actionResult;
}

const UpdateMenuCategory = toSafeResult(
  async (input: UpdateMenuCategoryInput & { menuCategoryId: number }) => {
    const { userId } = await getSessionContext();
    if (!userId) {
      throw new AppError(
        "You must be signed in to update a category.",
        "UNAUTHORIZED",
      );
    }

    const selectedLocation = await AppService.getSelectedLocation(userId);
    if (!selectedLocation) {
      throw new AppError(
        "No location selected. Please choose a location first.",
        "VALIDATION",
      );
    }

    return MenuService.updateMenuCategory(input.menuCategoryId, {
      name: input.name,
      locationId: selectedLocation.locationId,
      isEnabled: input.isEnabled,
    });
  },
);

export async function updateMenuCategoryAction(
  menuCategoryId: number,
  input: unknown,
) {
  const result = await validateWith(
    updateMenuCategorySchema,
    input,
  ).asyncAndThen((data) => UpdateMenuCategory({ ...data, menuCategoryId }));

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/menus");
    revalidatePath("/backoffice/menus/new");
    revalidatePath("/backoffice/menu_categories");
  }

  return actionResult;
}
