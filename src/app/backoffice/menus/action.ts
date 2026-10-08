"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { requireOwner, requirePermission } from "@/app/lib/access/roleGuard";
import {
  createMenuSchema,
  setMenuAvailableSchema,
  type CreateMenuInput,
  type SetMenuAvailableInput,
} from "@/app/lib/schemas/menu_menuCategorySchema";
import { parseMenuFormData } from "@/app/lib/menu/menuFormData";
import { MenuService, MenuStockService } from "@/app/services";

const safeCreateMenu = toSafeResult(async (input: CreateMenuInput) => {
  // A selected location is needed (the new stock is set there).
  const { companyId } = await requireOwner({ withLocation: true });

  const menu = await MenuService.createMenu({
    name: input.name,
    price: input.price,
    description: input.description,
    quantity: input.quantity,
    isAvailable: input.isAvailable,
    categoryIds: input.categoryIds,
    addonCategoryIds: input.addonCategoryIds,
    companyId,
    shownLocationIds: input.shownLocationIds,
  });

  if (input.image) await MenuService.saveMenuImage(menu.id, input.image);

  return { id: menu.id };
});

export async function createMenuAction(formData: FormData) {
  const result = await validateWith(
    createMenuSchema,
    parseMenuFormData(formData),
  ).asyncAndThen(safeCreateMenu);

  const actionResult = toActionResult(result);

  return actionResult;
}
const safeUpdateMenu = toSafeResult(
  async (input: CreateMenuInput & { menuId: number }) => {
    const { companyId, locationId } = await requireOwner({
      withLocation: true,
    });

    const menu = await MenuService.updateMenu(input.menuId, {
      name: input.name,
      price: input.price,
      quantity: input.quantity,
      description: input.description,
      isAvailable: input.isAvailable,
      categoryIds: input.categoryIds,
      addonCategoryIds: input.addonCategoryIds,
      locationId,
      companyId,
      shownLocationIds: input.shownLocationIds,
    });

    if (input.image) await MenuService.saveMenuImage(menu.id, input.image);

    return { id: menu.id };
  },
);
export async function updateMenuAction(menuId: number, formData: FormData) {
  const result = await validateWith(
    createMenuSchema,
    parseMenuFormData(formData),
  ).asyncAndThen((data) => safeUpdateMenu({ ...data, menuId }));

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/menus");
    revalidatePath(`/backoffice/menus/${menuId}`);
  }

  return actionResult;
}

const safeSetMenuAvailable = toSafeResult(
  async (input: SetMenuAvailableInput) => {
    // Daily operations (sold out for today, the machine is down): the
    // owner, or a manager the owner let turn menus on/off.
    // The location comes from the session (a manager's own location),
    // never from the input.
    const { companyId, locationId } = await requirePermission(
      "MENU_AVAILABILITY",
      { withLocation: true },
    );

    await MenuService.getCompanyMenu(input.menuId, companyId);
    await MenuStockService.setManualDisabled(
      input.menuId,
      locationId,
      !input.isAvailable,
    );

    return { menuId: input.menuId, isAvailable: input.isAvailable };
  },
);

/** The menu card's on/off switch — at the selected location only. */
export async function setMenuAvailableAction(input: {
  menuId: number;
  isAvailable: boolean;
}) {
  const result = await validateWith(setMenuAvailableSchema, input).asyncAndThen(
    safeSetMenuAvailable,
  );

  const actionResult = toActionResult(result);
  if (actionResult.success) revalidatePath("/backoffice/menus");

  return actionResult;
}
