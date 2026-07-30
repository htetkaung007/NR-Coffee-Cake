"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import {
  createMenuSchema,
  type CreateMenuInput,
} from "@/app/lib/schemas/menuSchema";
import { getSessionContext } from "@/app/lib/session";
import { getFileStorageService } from "@/app/lib/storage/getFileStorageService";
import { AppService, MenuService } from "@/app/services";

const safeCreateMenu = toSafeResult(async (input: CreateMenuInput) => {
  const { companyId, userId } = await getSessionContext();
  if (!companyId || !userId) {
    throw new AppError(
      "You must be signed in to create a menu item.",
      "UNAUTHORIZED",
    );
  }

  const selectedLocation = await AppService.getSelectedLocation(userId);
  if (!selectedLocation) {
    throw new AppError(
      "Select a location before creating a menu item.",
      "NO_SELECTED_LOCATION",
    );
  }

  const menu = await MenuService.createMenu({
    name: input.name,
    price: input.price,
    quantity: input.quantity,
    isAvailable: input.isAvailable,
    categoryIds: input.categoryIds,
    locationId: selectedLocation.locationId,
  });

  if (input.image) {
    const storage = getFileStorageService();
    const { url } = await storage.upload(
      Buffer.from(await input.image.arrayBuffer()),
      input.image.type,
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
    quantity: formData.get("quantity"),
    isAvailable: formData.get("isAvailable") === "true",
    categoryIds: formData.getAll("categoryIds"),
    image,
  }).asyncAndThen(safeCreateMenu);

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/menus");
  }

  return actionResult;
}
