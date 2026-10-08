"use server";

import {
  toSafeResult,
  validateWith,
  toActionResult,
} from "@/app/lib/actionHelper";
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
import { requireOwner, requirePermission } from "@/app/lib/access/roleGuard";
import { AddonService } from "@/app/services";
import { revalidatePath } from "next/cache";

const CreateAddonGroup = toSafeResult(async (input: CreateAddonGroupInput) => {
  await requireOwner();

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
    await requireOwner();

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
  // Daily operations (ran out of oat milk): the owner, or a manager the
  // owner let turn add-ons on/off. Checked against the session + DB.
  await requirePermission("ADDON_AVAILABILITY");
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
    // Owner only — it changes the ordering rules of every menu using
    // the group.
    await requireOwner();
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
