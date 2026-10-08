"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { requireOwner } from "@/app/lib/access/roleGuard";
import {
  createManagerSchema,
  type CreateManagerInput,
} from "@/app/lib/schemas/authSchema";
import {
  updateCompanyNameSchema,
  type UpdateCompanyNameInput,
} from "@/app/lib/schemas/companyNameSchema";
import {
  setManagerPermissionsSchema,
  type SetManagerPermissionsInput,
} from "@/app/lib/schemas/managerPermissionsSchema";
import { CompanyService, ManagerService } from "@/app/services";

const safeCreateManager = toSafeResult(async (input: CreateManagerInput) => {
  const { companyId, userId } = await requireOwner();

  return ManagerService.createManagerForLocation({
    email: input.email,
    password: input.password,
    companyId,
    locationId: input.locationId,
    ownerId: userId,
    permissions: input.permissions,
  });
});

/** A plain object, not FormData: "no permissions ticked" (an empty list)
 *  must stay different from "not sent" (→ the defaults). */
export async function createManagerAction(input: CreateManagerInput) {
  const result = await validateWith(createManagerSchema, input).asyncAndThen(
    safeCreateManager,
  );

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/setting");
  }

  return actionResult;
}

/** The company and the granting owner come from the session — the input
 *  only names the manager and the ticks. */
const safeSetManagerPermissions = toSafeResult(
  async (input: SetManagerPermissionsInput) => {
    const { companyId, userId } = await requireOwner();
    return ManagerService.setManagerPermissions({
      companyId,
      ownerId: userId,
      managerId: input.managerId,
      permissions: input.permissions,
    });
  },
);

export async function setManagerPermissionsAction(
  input: SetManagerPermissionsInput,
) {
  const result = await validateWith(setManagerPermissionsSchema, input).asyncAndThen(
    safeSetManagerPermissions,
  );

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/setting");
  }

  return actionResult;
}

/** The company to rename is ALWAYS the signed-in Admin's own — taken from
 *  the session, never from the client's input. */
const safeRequireCompanyAdmin = toSafeResult(() => requireOwner());

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
