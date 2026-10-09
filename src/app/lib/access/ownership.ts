import type { LocatedScope } from "./rolePolicy";

/** Ownership rules for ids that come from the client — pure
 *  (client-safe). The Services load the row scoped by the session's
 *  company, then ask these; a "no" is the same NotFoundError as a row
 *  that doesn't exist, so another company's (or location's) id is never
 *  revealed. */

/**
 * May `scope` act on a row that lives at `target.locationId`?
 * - never outside the scope's own company;
 * - ADMIN (the owner): any location of the company;
 * - MANAGER: only their own location (a manager's scope.locationId is
 *   User.locationId — see LocationService.getSelectedLocation).
 */
export function canActAtLocation(
  scope: Pick<LocatedScope, "companyId" | "role" | "locationId">,
  target: { companyId: number; locationId: number },
): boolean {
  if (target.companyId !== scope.companyId) return false;
  return scope.role === "ADMIN" || target.locationId === scope.locationId;
}

/** The first requested id that isn't among `ownedIds` (null when every
 *  one is) — for a list of client ids that must ALL be the company's. */
export function firstUnownedId(
  requestedIds: readonly number[],
  ownedIds: Iterable<number>,
): number | null {
  const owned = new Set(ownedIds);
  return requestedIds.find((id) => !owned.has(id)) ?? null;
}
