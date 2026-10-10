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
import {
  moveManagerSchema,
  removeManagerSchema,
} from "@/app/lib/schemas/managerAccountSchema";
import { CompanyService, ManagerService } from "@/app/services";

/** Where a manager change shows: this page, and each location's delete
 *  rule (blocked while managers are assigned there). */
function revalidateManagers() {
  revalidatePath("/backoffice/setting");
  revalidatePath("/backoffice/locations", "layout");
}

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
const safeRequireOwner = toSafeResult(() => requireOwner());

const safeUpdateCompanyName = toSafeResult(
  async (input: UpdateCompanyNameInput & { companyId: number }) =>
    CompanyService.updateName(input.companyId, input.name),
);

export async function updateCompanyNameAction(formData: FormData) {
  const result = await safeRequireOwner()
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

const safeRemoveManager = toSafeResult(ManagerService.removeManager);

/** Settings → Managers "Remove": deletes the manager's account. The
 *  owner guard runs FIRST; the manager must be the owner's own company's
 *  (the company comes from the session, never the input). The removed
 *  manager is signed out on their next request (the guards re-check
 *  that the session's user still exists). */
export async function removeManagerAction(managerId: number) {
  const result = await safeRequireOwner()
    .andThen(({ companyId }) =>
      validateWith(removeManagerSchema, { managerId }).map((data) => ({
        ...data,
        companyId,
      })),
    )
    .andThen(safeRemoveManager);

  const actionResult = toActionResult(result);
  if (actionResult.success) revalidateManagers();
  return actionResult;
}

const safeMoveManager = toSafeResult(ManagerService.moveManager);

/** Settings → Managers "Move to…": same guard-first order; the manager
 *  and the location must both be the owner's company's, and the location
 *  open. The manager's permissions stay. */
export async function moveManagerAction(managerId: number, locationId: number) {
  const result = await safeRequireOwner()
    .andThen(({ companyId }) =>
      validateWith(moveManagerSchema, { managerId, locationId }).map(
        (data) => ({ ...data, companyId }),
      ),
    )
    .andThen(safeMoveManager);

  const actionResult = toActionResult(result);
  if (actionResult.success) revalidateManagers();
  return actionResult;
}
