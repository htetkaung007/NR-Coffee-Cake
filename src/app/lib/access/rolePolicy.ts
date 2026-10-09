import { AppError } from "../errors";

/** Who may do what in the Backoffice — pure (client-safe). The session
 *  side is roleGuard.ts. */

export type StaffRole = "ADMIN" | "MANAGER";

/** Who is acting, once the role check has passed. */
export interface StaffScope {
  companyId: number;
  userId: number;
  role: StaffRole;
}

/** A scope plus the location the user is working in — an owner's
 *  selected location, a manager's own (User.locationId). */
export interface LocatedScope extends StaffScope {
  locationId: number;
}

/** The FORBIDDEN message for owner-only changes on the add-ons page. */
export const OWNER_ONLY_MESSAGE = "Only the owner can change this.";

/**
 * THE role check for Server Actions, pure: signed in (company + user),
 * and one of `allowed` — otherwise a safe AppError (UNAUTHORIZED /
 * FORBIDDEN with `forbiddenMessage`). Returns the session's scope.
 */
export function assertRole(
  session: { companyId: number | null; userId: number | null; role: StaffRole },
  allowed: readonly StaffRole[],
  forbiddenMessage: string,
): StaffScope {
  if (!session.companyId || !session.userId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  if (!allowed.includes(session.role)) {
    throw new AppError(forbiddenMessage, "FORBIDDEN");
  }
  return { companyId: session.companyId, userId: session.userId, role: session.role };
}
