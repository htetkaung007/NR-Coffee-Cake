import { AppError } from "../errors";
import { hasPermission, type PermissionKey } from "./permissions";
import {
  assertRole,
  type LocatedScope,
  type StaffScope,
} from "./rolePolicy";
import { getSessionContext } from "./session";
import { LocationService, PermissionService } from "@/app/services";

/** Server-only: who may do what, checked against the SESSION (never the
 *  client's input) at the start of every Backoffice Server Action, page
 *  and route. The pure rules are rolePolicy.ts and permissions.ts. */

const NO_PERMISSION_MESSAGE =
  "You don't have permission to do this. Ask the owner.";
const OWNER_ONLY_ACTION_MESSAGE = "Only the owner can do this.";

/** The one error for "this needs a selected location and there's none". */
const NO_LOCATION_MESSAGE = "Select a location first.";

interface GuardOptions {
  /** Also resolve the user's selected location (an owner's
   *  SelectedLocation, a manager's own) — missing → NO_SELECTED_LOCATION. */
  withLocation?: boolean;
  /** Overrides the FORBIDDEN message. */
  forbiddenMessage?: string;
}

/** `scope` plus its selected location — never one named by the client
 *  (LocationService.getSelectedLocation, which only returns a location
 *  of the session's company; another company's reads as none). Shared by
 *  the guards' `withLocation` option and requireBackofficeContext. */
export async function withSelectedLocation(
  scope: StaffScope,
): Promise<LocatedScope> {
  const selected = await LocationService.getSelectedLocation(
    scope.userId,
    scope.companyId,
  );
  if (!selected) {
    throw new AppError(NO_LOCATION_MESSAGE, "NO_SELECTED_LOCATION");
  }
  return { ...scope, locationId: selected.locationId };
}

function located(
  scope: StaffScope,
  options: GuardOptions,
): Promise<StaffScope | LocatedScope> | StaffScope {
  return options.withLocation ? withSelectedLocation(scope) : scope;
}

/** Signed in as any staff (owner or manager) — the always-allowed order
 *  work. */
export function requireStaff(
  options: GuardOptions & { withLocation: true },
): Promise<LocatedScope>;
export function requireStaff(options?: GuardOptions): Promise<StaffScope>;
export async function requireStaff(
  options: GuardOptions = {},
): Promise<StaffScope | LocatedScope> {
  const scope = assertRole(
    await getSessionContext(),
    ["ADMIN", "MANAGER"],
    options.forbiddenMessage ?? NO_PERMISSION_MESSAGE,
  );
  return located(scope, options);
}

/** Signed in as the owner (ADMIN) — the never-grantable actions. */
export function requireOwner(
  options: GuardOptions & { withLocation: true },
): Promise<LocatedScope>;
export function requireOwner(options?: GuardOptions): Promise<StaffScope>;
export async function requireOwner(
  options: GuardOptions = {},
): Promise<StaffScope | LocatedScope> {
  const scope = assertRole(
    await getSessionContext(),
    ["ADMIN"],
    options.forbiddenMessage ?? OWNER_ONLY_ACTION_MESSAGE,
  );
  return located(scope, options);
}

/** Signed in, and allowed `key`: an owner always (no database read); a
 *  manager only if the owner granted it — read from the database on
 *  every call, so revoking takes effect on the next request. */
export function requirePermission(
  key: PermissionKey,
  options: GuardOptions & { withLocation: true },
): Promise<LocatedScope>;
export function requirePermission(
  key: PermissionKey,
  options?: GuardOptions,
): Promise<StaffScope>;
export async function requirePermission(
  key: PermissionKey,
  options: GuardOptions = {},
): Promise<StaffScope | LocatedScope> {
  const scope = await requireStaff();
  if (scope.role !== "ADMIN") {
    const granted = await PermissionService.getGrantedPermissions(scope.userId);
    if (!hasPermission(scope.role, granted, key)) {
      throw new AppError(
        options.forbiddenMessage ?? NO_PERMISSION_MESSAGE,
        "FORBIDDEN",
      );
    }
  }
  return located(scope, options);
}
