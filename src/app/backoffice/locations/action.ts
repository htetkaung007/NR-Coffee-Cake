"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import {
  createLocationSchema,
  updateLocationSchema,
  type CreateLocationInput,
  type UpdateLocationInput,
} from "@/app/lib/schemas/locationSchema";
import { requireOwner } from "@/app/lib/access/roleGuard";
import { LocationService } from "@/app/services";

const safeCreateLocation = toSafeResult(async (input: CreateLocationInput) => {
  // Every action in this file is the owner's: managers have no
  // Location access at all (their location is fixed by the owner).
  const { companyId } = await requireOwner();
  return LocationService.createLocation(
    companyId,
    input.name,
    input.startingMenus,
  );
});

export async function createLocationAction(formData: FormData) {
  const result = await validateWith(createLocationSchema, {
    name: formData.get("name"),
    startingMenus: formData.get("startingMenus"),
  }).asyncAndThen(safeCreateLocation);

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/locations");
    revalidatePath("/backoffice/menus");
  }

  return actionResult;
}

const safeUpdateLocationName = toSafeResult(
  async (input: UpdateLocationInput & { locationId: number }) => {
    const { companyId } = await requireOwner();
    return LocationService.updateLocationName(
      input.locationId,
      companyId,
      input.name,
    );
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
    // The top bar (in the Backoffice layout) shows the selected
    // location's name.
    revalidatePath("/backoffice", "layout");
  }

  return actionResult;
}

const safeToggleArchive = toSafeResult(
  async (input: { locationId: number; isArchived: boolean }) => {
    const { companyId } = await requireOwner();
    return LocationService.toggleLocationArchive(
      input.locationId,
      companyId,
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
    // An archived selected location drops out of the top bar.
    revalidatePath("/backoffice", "layout");
  }

  return actionResult;
}

const safeHardDelete = toSafeResult(async (locationId: number) => {
  // Owner only; the location must be the owner's own company's.
  const { companyId } = await requireOwner();
  await LocationService.deleteLocation(locationId, companyId);
  return { id: locationId };
});

export async function hardDeleteLocationAction(locationId: number) {
  const result = await safeHardDelete(locationId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/locations");
    // An admin's selected location may have moved (top bar, every page).
    revalidatePath("/backoffice", "layout");
  }

  return actionResult;
}

const safeSetSelected = toSafeResult(async (locationId: number) => {
  // Switching location is the owner's — a manager's is fixed.
  const { companyId, userId } = await requireOwner();
  return LocationService.setSelectedLocation(userId, companyId, locationId);
});

export async function selectLocationAction(locationId: number) {
  const result = await safeSetSelected(locationId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice", "layout");
  }

  return actionResult;
}
