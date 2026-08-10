"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import {
  createLocationSchema,
  updateLocationSchema,
  type CreateLocationInput,
  type UpdateLocationInput,
} from "@/app/lib/schemas/locationSchema";
import { getSessionContext } from "@/app/lib/session";
import { AppService, LocationService } from "@/app/services";

/** Every write in this file starts by confirming the caller is an
 *  Admin — Managers have no Location-management access at all (their
 *  location is fixed, assigned by an Admin elsewhere). Kept as a small
 *  repeated check rather than a shared helper: four call sites, and
 *  each one's error message/context is specific enough that a shared
 *  wrapper wouldn't save much. */
async function requireAdmin() {
  const { companyId, role } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  if (role !== "ADMIN") {
    throw new AppError("Only Admins can manage locations.", "FORBIDDEN");
  }
  return companyId;
}

const safeCreateLocation = toSafeResult(async (input: CreateLocationInput) => {
  const companyId = await requireAdmin();
  return LocationService.createLocation(companyId, input.name);
});

export async function createLocationAction(formData: FormData) {
  const result = await validateWith(createLocationSchema, {
    name: formData.get("name"),
  }).asyncAndThen(safeCreateLocation);

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/locations");
  }

  return actionResult;
}

const safeUpdateLocationName = toSafeResult(
  async (input: UpdateLocationInput & { locationId: number }) => {
    await requireAdmin();
    return LocationService.updateLocationName(input.locationId, input.name);
  },
);

export async function updateLocationNameAction(
  locationId: number,
  formData: FormData,
) {
  const result = await validateWith(updateLocationSchema, {
    name: formData.get("name"),
  }).asyncAndThen((data) => safeUpdateLocationName({ ...data, locationId }));

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/locations");
    revalidatePath(`/backoffice/locations/${locationId}`);
  }

  return actionResult;
}

const safeToggleArchive = toSafeResult(
  async (input: { locationId: number; isArchived: boolean }) => {
    await requireAdmin();
    return LocationService.toggleLocationArchive(
      input.locationId,
      input.isArchived,
    );
  },
);

export async function toggleLocationArchiveAction(
  locationId: number,
  isArchived: boolean,
) {
  const result = await safeToggleArchive({ locationId, isArchived });
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/locations");
    revalidatePath(`/backoffice/locations/${locationId}`);
  }

  return actionResult;
}

const safeHardDelete = toSafeResult(async (locationId: number) => {
  await requireAdmin();
  return LocationService.hardDeleteLocation(locationId);
});

export async function hardDeleteLocationAction(locationId: number) {
  const result = await safeHardDelete(locationId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/locations");
  }

  return actionResult;
}

const safeSetSelected = toSafeResult(
  async (input: { userId: number; locationId: number }) =>
    AppService.setSelectedLocation(input.userId, input.locationId),
);

export async function selectLocationAction(locationId: number) {
  const { userId } = await getSessionContext();
  if (!userId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }

  const result = await safeSetSelected({ userId, locationId });
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice", "layout");
  }

  return actionResult;
}
