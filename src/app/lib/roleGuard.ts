import { getSessionContext } from "./session";
import { assertRole, type StaffRole, type StaffScope } from "./rolePolicy";

/** assertRole against the signed-in user's session — what a Server
 *  Action calls (the role always comes from the session, never input).
 *  Server-only: the pure rules (and their messages) are rolePolicy.ts. */
export async function requireRole(
  allowed: readonly StaffRole[],
  forbiddenMessage: string,
): Promise<StaffScope> {
  return assertRole(await getSessionContext(), allowed, forbiddenMessage);
}

/** requireRole for Admin-only actions. */
export function requireAdmin(forbiddenMessage: string): Promise<StaffScope> {
  return requireRole(["ADMIN"], forbiddenMessage);
}
