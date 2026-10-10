/** Why a manager can't be assigned to a location. */
export type ManagerAssignmentBlock = "closedLocation" | "alreadyThere";

/**
 * THE rule for assigning a manager to a location (adding one, or moving
 * one there), given a location already known to be the company's:
 * - an archived (closed) location → no; reopen it first.
 * - the location the manager already works at → nothing to move.
 * - otherwise → yes.
 */
export function managerAssignmentBlock(input: {
  target: { id: number; isArchived: boolean };
  /** The manager's current location — omitted for a new manager. */
  currentLocationId?: number | null;
}): ManagerAssignmentBlock | null {
  if (input.target.isArchived) return "closedLocation";
  if (input.currentLocationId === input.target.id) return "alreadyThere";
  return null;
}

/** The owner-facing explanation for each block. */
export const MANAGER_ASSIGNMENT_MESSAGES: Record<ManagerAssignmentBlock, string> = {
  closedLocation:
    "This location is closed. Reopen it before assigning a manager there.",
  alreadyThere: "This manager already works at this location.",
};
