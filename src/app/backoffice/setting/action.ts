"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import { requireAdmin } from "@/app/lib/roleGuard";
import {
  createManagerSchema,
  type CreateManagerInput,
} from "@/app/lib/schemas/authSchema";
import {
  updateCompanyNameSchema,
  type UpdateCompanyNameInput,
} from "@/app/lib/schemas/companyNameSchema";
import { getSessionContext } from "@/app/lib/session";
import { AppService, CompanyService, LocationService } from "@/app/services";

const safeCreateManager = toSafeResult(async (input: CreateManagerInput) => {
  const { companyId } = await requireAdmin("Only Admins can add Manager accounts.");

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
    return LocationService.setSelectedLocation(input.userId, input.locationId);
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

/** The company to rename is ALWAYS the signed-in Admin's own — taken from
 *  the session, never from the client's input. */
const safeRequireCompanyAdmin = toSafeResult(() =>
  requireAdmin("Only Admins can rename the company."),
);

const safeUpdateCompanyName = toSafeResult(
  async (input: UpdateCompanyNameInput & { companyId: number }) =>
    CompanyService.updateName(input.companyId, input.name),
);

export async function updateCompanyNameAction(formData: FormData) {
  const result = await safeRequireCompanyAdmin()
    .andThen(({ companyId }) =>
      validateWith(updateCompanyNameSchema, {
        name: formData.get("name"),
      }).map((data) => ({ ...data, companyId })),
    )
    .andThen(safeUpdateCompanyName);

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    // The top bar (in the Backoffice layout) shows the company name.
    revalidatePath("/backoffice", "layout");
  }

  return actionResult;
}
