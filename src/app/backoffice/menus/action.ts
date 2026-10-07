"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { requireOwner, requirePermission } from "@/app/lib/roleGuard";
import { AppError } from "@/app/lib/errors";
import {
  createMenuSchema,
  setMenuAvailableSchema,
  type CreateMenuInput,
  type SetMenuAvailableInput,
} from "@/app/lib/schemas/menu_menuCategorySchema";
import { getFileStorageService } from "@/app/lib/storage/getFileStorageService";
import {
  LocationService,
  MenuService,
  MenuStockService,
} from "@/app/services";

const safeCreateMenu = toSafeResult(async (input: CreateMenuInput) => {
  const { userId, companyId } = await requireOwner();

  const selectedLocation = await LocationService.getSelectedLocation(userId);
  if (!selectedLocation) {
    throw new AppError(
      "Select a location before creating a menu item.",
      "NO_SELECTED_LOCATION",
    );
  }

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

  if (input.image) {
    const storage = getFileStorageService();
    const { url } = await storage.upload(
      Buffer.from(await input.image.arrayBuffer()),
      input.image.type,
      "menu",
      menu.id,
    );
    await MenuService.setMenuAsset(menu.id, url);
  }

  return { id: menu.id };
});

export async function createMenuAction(formData: FormData) {
  const imageEntry = formData.get("image");
  const image =
    imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const result = await validateWith(createMenuSchema, {
    name: formData.get("name"),
    price: formData.get("price"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    isAvailable: formData.get("isAvailable") === "true",
    categoryIds: formData.getAll("categoryIds"),
    addonCategoryIds: formData.getAll("addonCategoryIds"),
    shownLocationIds: formData.getAll("shownLocationIds"),
    image,
  }).asyncAndThen(safeCreateMenu);

  const actionResult = toActionResult(result);

  return actionResult;
}
const safeUpdateMenu = toSafeResult(
  async (input: CreateMenuInput & { menuId: number }) => {
    const { userId, companyId } = await requireOwner();

    const selectedLocation = await LocationService.getSelectedLocation(userId);
    if (!selectedLocation) {
      throw new AppError(
        "Select a location before updating a menu item.",
        "NO_SELECTED_LOCATION",
      );
    }

    const menu = await MenuService.updateMenu(input.menuId, {
      name: input.name,
      price: input.price,
      quantity: input.quantity,
      description: input.description,
      isAvailable: input.isAvailable,
      categoryIds: input.categoryIds,
      addonCategoryIds: input.addonCategoryIds,
      locationId: selectedLocation.locationId,
      companyId,
      shownLocationIds: input.shownLocationIds,
    });

    if (input.image) {
      const storage = getFileStorageService();
      const { url } = await storage.upload(
        Buffer.from(await input.image.arrayBuffer()),
        input.image.type,
        "menu",
        menu.id,
      );
      await MenuService.setMenuAsset(menu.id, url);
    }

    return { id: menu.id };
  },
);
export async function updateMenuAction(menuId: number, formData: FormData) {
  const imageEntry = formData.get("image");
  const image =
    imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const result = await validateWith(createMenuSchema, {
    name: formData.get("name"),
    price: formData.get("price"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    isAvailable: formData.get("isAvailable") === "true",
    categoryIds: formData.getAll("categoryIds"),
    addonCategoryIds: formData.getAll("addonCategoryIds"),
    shownLocationIds: formData.getAll("shownLocationIds"),
    image,
  }).asyncAndThen((data) => safeUpdateMenu({ ...data, menuId }));

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
    const { userId, companyId } = await requirePermission("MENU_AVAILABILITY");

    // The location comes from the session (a manager's own location),
    // never from the input.
    const selectedLocation = await LocationService.getSelectedLocation(userId);
    if (!selectedLocation) {
      throw new AppError(
        "Select a location before turning a menu on or off.",
        "NO_SELECTED_LOCATION",
      );
    }

    await MenuService.getCompanyMenu(input.menuId, companyId);
    await MenuStockService.setManualDisabled(
      input.menuId,
      selectedLocation.locationId,
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
