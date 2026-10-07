import { AppError } from "./errors";
import { hasPermission, type PermissionKey } from "./permissions";
import { assertRole, type StaffScope } from "./rolePolicy";
import { getSessionContext } from "./session";
import { PermissionService } from "@/app/services";

/** Server-only: who may do what, checked against the SESSION (never the
 *  client's input) at the start of every Backoffice Server Action, page
 *  and route. The pure rules are rolePolicy.ts and permissions.ts. */

const NO_PERMISSION_MESSAGE =
  "You don't have permission to do this. Ask the owner.";
const OWNER_ONLY_ACTION_MESSAGE = "Only the owner can do this.";

/** Signed in as any staff (owner or manager) — the always-allowed order
 *  work. */
export async function requireStaff(): Promise<StaffScope> {
  return assertRole(
    await getSessionContext(),
    ["ADMIN", "MANAGER"],
    NO_PERMISSION_MESSAGE,
  );
}

/** Signed in as the owner (ADMIN) — the never-grantable actions. */
export async function requireOwner(
  forbiddenMessage: string = OWNER_ONLY_ACTION_MESSAGE,
): Promise<StaffScope> {
  return assertRole(await getSessionContext(), ["ADMIN"], forbiddenMessage);
}

/** Signed in, and allowed `key`: an owner always (no database read); a
 *  manager only if the owner granted it — read from the database on
 *  every call, so revoking takes effect on the next request. */
export async function requirePermission(
  key: PermissionKey,
  forbiddenMessage: string = NO_PERMISSION_MESSAGE,
): Promise<StaffScope> {
  const scope = await requireStaff();
  if (scope.role === "ADMIN") return scope;
  const granted = await PermissionService.getGrantedPermissions(scope.userId);
  if (!hasPermission(scope.role, granted, key)) {
    throw new AppError(forbiddenMessage, "FORBIDDEN");
  }
  return scope;
}
