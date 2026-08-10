"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import {
  createManagerSchema,
  type CreateManagerInput,
} from "@/app/lib/schemas/authSchema";
import { getSessionContext } from "@/app/lib/session";
import { AppService } from "@/app/services";

const safeCreateManager = toSafeResult(async (input: CreateManagerInput) => {
  const { companyId, role } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  if (role !== "ADMIN") {
    throw new AppError("Only Admins can add Manager accounts.", "FORBIDDEN");
  }

  return AppService.createManagerForLocation({
    email: input.email,
    password: input.password,
    companyId,
    locationId: input.locationId,
  });
});

export async function createManagerAction(formData: FormData) {
  const result = await validateWith(createManagerSchema, {
    email: formData.get("email"),
    password: formData.get("password"),
    locationId: formData.get("locationId"),
  }).asyncAndThen(safeCreateManager);

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/settings");
  }

  return actionResult;
}

const safeSetSelectedLocation = toSafeResult(
  async (input: { userId: number | null; locationId: number }) => {
    if (!input.userId) {
      throw new AppError("You must be signed in.", "UNAUTHORIZED");
    }
    return AppService.setSelectedLocation(input.userId, input.locationId);
  },
);

export async function setSelectedLocationAction(locationId: number) {
  const { userId } = await getSessionContext();
  const result = await safeSetSelectedLocation({ userId, locationId });
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    // Every page that reads getSelectedLocation needs to reflect the
    // change — menus list/create/edit all depend on it.
    revalidatePath("/backoffice", "layout");
  }

  return actionResult;
}
