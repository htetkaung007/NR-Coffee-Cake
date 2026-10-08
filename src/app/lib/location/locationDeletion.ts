/** Why a location can't be deleted permanently. */
export type LocationDeletionBlock = "hasSales" | "hasManagers";

export type LocationDeletion =
  | { allowed: true }
  | { allowed: false; reason: LocationDeletionBlock };

/**
 * THE rule for deleting a location permanently (no grace period):
 * - sales history (any order round or bill there) → never; archive it
 *   instead, so its data stays in the reports. Checked first — moving
 *   managers wouldn't help.
 * - managers assigned to it → not until they're moved or removed.
 * - otherwise → yes, right away, archived or not.
 */
export function locationDeletion(facts: {
  hasSales: boolean;
  managerCount: number;
}): LocationDeletion {
  if (facts.hasSales) return { allowed: false, reason: "hasSales" };
  if (facts.managerCount > 0) return { allowed: false, reason: "hasManagers" };
  return { allowed: true };
}

/** The owner-facing explanation for each block. */
export const LOCATION_DELETION_MESSAGES: Record<LocationDeletionBlock, string> = {
  hasSales:
    "This location has sales history, so it can be closed (archived) but not deleted.",
  hasManagers: "Move or remove its managers first.",
};
