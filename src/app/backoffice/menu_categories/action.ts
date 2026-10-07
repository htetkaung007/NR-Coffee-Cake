"use server";

import {
  toSafeResult,
  validateWith,
  toActionResult,
} from "@/app/lib/actionHelper";
import { requireOwner } from "@/app/lib/roleGuard";
import { AppError } from "@/app/lib/errors";
import {
  CreateMenuCategoryInput,
  createMenuCategorySchema,
  ReorderMenuCategoriesInput,
  reorderMenuCategoriesSchema,
  UpdateMenuCategoryInput,
  updateMenuCategorySchema,
} from "@/app/lib/schemas/menu_menuCategorySchema";
import { LocationService, MenuCategoryService } from "@/app/services";
import { revalidatePath } from "next/cache";

const CreateMenuCategory = toSafeResult(
  async (input: CreateMenuCategoryInput) => {
    const { companyId, userId } = await requireOwner();

    const selectedLocation = await LocationService.getSelectedLocation(userId);
    if (!selectedLocation) {
      throw new AppError(
        "No location selected. Please choose a location first.",
        "VALIDATION",
      );
    }

    return MenuCategoryService.createMenuCategory(
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
    const { userId } = await requireOwner();

    const selectedLocation = await LocationService.getSelectedLocation(userId);
    if (!selectedLocation) {
      throw new AppError(
        "No location selected. Please choose a location first.",
        "VALIDATION",
      );
    }

    return MenuCategoryService.updateMenuCategory(input.menuCategoryId, {
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

/** The signed-in user's company and currently selected location — the
 *  category order is company-wide, but which categories are being
 *  reordered depends on the location (see MenuCategoryService.reorder). */
async function resolveCompanyAndLocation() {
  const { companyId, userId } = await requireOwner();

  const selectedLocation = await LocationService.getSelectedLocation(userId);
  if (!selectedLocation) {
    throw new AppError(
      "No location selected. Please choose a location first.",
      "VALIDATION",
    );
  }
  return { companyId, locationId: selectedLocation.locationId };
}

/** Everywhere the category order shows: this page, the menu list and
 *  menu form chips, the customer menu, and the staff New Order screen. */
function revalidateCategoryOrder() {
  revalidatePath("/backoffice/menu_categories");
  revalidatePath("/backoffice/menus");
  revalidatePath("/backoffice/menus/new");
  revalidatePath("/menu");
  revalidatePath("/backoffice/order/new");
}

const ReorderMenuCategories = toSafeResult(
  async (input: ReorderMenuCategoriesInput) => {
    const { companyId, locationId } = await resolveCompanyAndLocation();
    return MenuCategoryService.reorder(companyId, locationId, input.orderedIds);
  },
);

/** Saves the new order of the categories visible at the selected
 *  location (drag-and-drop or the ↑/↓ buttons). */
export async function reorderMenuCategoriesAction(input: {
  orderedIds: number[];
}) {
  const result = await validateWith(
    reorderMenuCategoriesSchema,
    input,
  ).asyncAndThen(ReorderMenuCategories);

  const actionResult = toActionResult(result);
  if (actionResult.success) revalidateCategoryOrder();
  return actionResult;
}

const SortMenuCategoriesAlphabetically = toSafeResult(async () => {
  const { companyId, locationId } = await resolveCompanyAndLocation();
  return MenuCategoryService.sortAlphabetically(companyId, locationId);
});

/** "Sort A → Z" — replaces the custom order of the categories visible at
 *  the selected location. No input to validate. Returns the new order. */
export async function sortMenuCategoriesAlphabeticallyAction() {
  const actionResult = toActionResult(await SortMenuCategoriesAlphabetically());
  if (actionResult.success) revalidateCategoryOrder();
  return actionResult;
}
