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
} from "@/app/lib/schemas/menu_menuCategorySchema";
import { getSessionContext } from "@/app/lib/session";
import { MenuService } from "@/app/services";
import { revalidatePath } from "next/cache";

const CreateMenuCategory = toSafeResult(
  async (input: CreateMenuCategoryInput) => {
    const { companyId } = await getSessionContext();
    if (!companyId) {
      throw new AppError(
        "You must be signed in to create a category.",
        "UNAUTHORIZED",
      );
    }

    return MenuService.createMenuCategory(companyId, input.name);
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
  }

  return actionResult;
}
