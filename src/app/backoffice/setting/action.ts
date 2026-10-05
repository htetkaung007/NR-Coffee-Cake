"use server";

import { revalidatePath } from "next/cache";
import { err, ok, type Result } from "neverthrow";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { AppError, type ErrorInfo } from "@/app/lib/errors";
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
function requireAdminCompany(session: {
  companyId: number | null;
  role: string;
}): Result<number, ErrorInfo> {
  if (!session.companyId) {
    return err({ message: "You must be signed in.", code: "UNAUTHORIZED" });
  }
  if (session.role !== "ADMIN") {
    return err({
      message: "Only Admins can rename the company.",
      code: "FORBIDDEN",
    });
  }
  return ok(session.companyId);
}

const safeUpdateCompanyName = toSafeResult(
  async (input: UpdateCompanyNameInput & { companyId: number }) =>
    CompanyService.updateName(input.companyId, input.name),
);

export async function updateCompanyNameAction(formData: FormData) {
  const session = await getSessionContext();
  const result = await requireAdminCompany(session)
    .andThen((companyId) =>
      validateWith(updateCompanyNameSchema, {
        name: formData.get("name"),
      }).map((data) => ({ ...data, companyId })),
    )
    .asyncAndThen(safeUpdateCompanyName);

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    // The top bar (in the Backoffice layout) shows the company name.
    revalidatePath("/backoffice", "layout");
  }

  return actionResult;
}
