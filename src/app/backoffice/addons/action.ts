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
  SetAddonAvailableInput,
  setAddonAvailableSchema,
  SetAddonGroupRequiredInput,
  setAddonGroupRequiredSchema,
  UpdateAddonGroupInput,
  updateAddonGroupSchema,
} from "@/app/lib/schemas/addonSchema";
import { ADDON_CHANGE_ROLES, OWNER_ONLY_MESSAGE } from "@/app/lib/rolePolicy";
import { requireRole } from "@/app/lib/roleGuard";
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

const safeSetAddonAvailable = toSafeResult(async (input: SetAddonAvailableInput) => {
  // Admins and Managers — daily operations (ran out of oat milk). The
  // role is the session's, never the client's.
  await requireRole(ADDON_CHANGE_ROLES.availability, OWNER_ONLY_MESSAGE);
  return AddonService.setAddonAvailable(input.addonId, input.isAvailable);
});

/** The Add-ons panel's on/off switch for one option. */
export async function setAddonAvailableAction(addonId: number, isAvailable: boolean) {
  const result = await validateWith(setAddonAvailableSchema, {
    addonId,
    isAvailable,
  }).asyncAndThen(safeSetAddonAvailable);
  const actionResult = toActionResult(result);
  if (actionResult.success) revalidatePath("/backoffice/addons");
  return actionResult;
}

const safeSetAddonGroupRequired = toSafeResult(
  async (input: SetAddonGroupRequiredInput) => {
    // Admins only — it changes the ordering rules of every menu using
    // the group.
    await requireRole(ADDON_CHANGE_ROLES.required, OWNER_ONLY_MESSAGE);
    return AddonService.setAddonGroupRequired(
      input.addonCategoryId,
      input.isRequired,
    );
  },
);

/** The Add-ons panel's Required switch for a group. */
export async function setAddonGroupRequiredAction(
  addonCategoryId: number,
  isRequired: boolean,
) {
  const result = await validateWith(setAddonGroupRequiredSchema, {
    addonCategoryId,
    isRequired,
  }).asyncAndThen(safeSetAddonGroupRequired);
  const actionResult = toActionResult(result);
  if (actionResult.success) revalidatePath("/backoffice/addons");
  return actionResult;
}
