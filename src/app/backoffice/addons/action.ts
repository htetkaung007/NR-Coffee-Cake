"use server";

import {
  toSafeResult,
  validateWith,
  toActionResult,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import {
  CreateAddonGroupInput,
  createAddonGroupSchema,
  UpdateAddonGroupInput,
  updateAddonGroupSchema,
} from "@/app/lib/schemas/addonSchema";
import { getSessionContext } from "@/app/lib/session";
import { AddonService } from "@/app/services";
import { revalidatePath } from "next/cache";

const CreateAddonGroup = toSafeResult(async (input: CreateAddonGroupInput) => {
  const { userId } = await getSessionContext();
  if (!userId) {
    throw new AppError(
      "You must be signed in to create an addon group.",
      "UNAUTHORIZED",
    );
  }

  return AddonService.createAddonCategoryWithAddons(input);
});

export async function createAddonGroupAction(input: unknown) {
  const result = await validateWith(createAddonGroupSchema, input).asyncAndThen(
    CreateAddonGroup,
  );

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/addons");
    revalidatePath("/backoffice/addons/new");
  }

  return actionResult;
}

const UpdateAddonGroup = toSafeResult(
  async (input: UpdateAddonGroupInput & { addonCategoryId: number }) => {
    const { userId } = await getSessionContext();
    if (!userId) {
      throw new AppError(
        "You must be signed in to update an addon group.",
        "UNAUTHORIZED",
      );
    }

    return AddonService.updateAddonCategoryWithAddons(
      input.addonCategoryId,
      input,
    );
  },
);

export async function updateAddonGroupAction(
  addonCategoryId: number,
  input: unknown,
) {
  const result = await validateWith(updateAddonGroupSchema, input).asyncAndThen(
    (data) => UpdateAddonGroup({ ...data, addonCategoryId }),
  );

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/addons");
    revalidatePath(`/backoffice/addons/${addonCategoryId}`);
  }

  return actionResult;
}
