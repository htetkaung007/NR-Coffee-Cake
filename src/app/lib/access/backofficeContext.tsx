import type { ReactElement } from "react";
import { Box, Typography } from "@mui/material";
import { AppError } from "@/app/lib/errors";
import type { AccessRule, PermissionKey } from "@/app/lib/access/permissions";
import type { StaffScope } from "@/app/lib/access/rolePolicy";
import {
  requireOwner,
  requirePermission,
  requireStaff,
  withSelectedLocation,
} from "@/app/lib/access/roleGuard";

export interface BackofficeContext {
  userId: number;
  companyId: number;
  role: "ADMIN" | "MANAGER";
  /** The selected location (an owner's choice, a manager's own). */
  location: { locationId: number };
}

/** The muted one-liner a Backoffice page shows instead of its content. */
function BackofficeNotice({ message }: { message: string }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}

/** Who may open a Backoffice page — the shared AccessRule. */
type PageAccess = AccessRule;

/** The notice a manager without access sees, per page area. */
const PERMISSION_AREA: Partial<Record<PermissionKey, string>> = {
  REPORTS_VIEW: "Reports",
  TABLES_MANAGE: "Tables",
};

function forbiddenMessage(access: PageAccess) {
  if (access === "owner") return "Only the owner can open this page.";
  const area = access === "staff" ? undefined : PERMISSION_AREA[access];
  return area
    ? `Ask the owner for access to ${area}.`
    : "Ask the owner for access to this page.";
}

/** The same server-side check the Server Actions run (lib/access/roleGuard). */
function checkAccess(access: PageAccess): Promise<StaffScope> {
  if (access === "staff") return requireStaff();
  if (access === "owner") return requireOwner();
  return requirePermission(access);
}

/**
 * The access check every Backoffice page starts with — on the SERVER,
 * from the session (and, for a permission, the database), never from
 * anything the browser sent. Pages don't throw or redirect: they render
 * a plain notice in place (signed out, or not allowed), so this hands
 * back either the user's scope or that notice:
 *
 *   const { scope, fallback } = await requireBackofficeAccess({
 *     signedOut: "Please sign in to view settings.",
 *     access: "owner",
 *   });
 *   if (!scope) return fallback;
 */
export async function requireBackofficeAccess(options: {
  signedOut: string;
  access: PageAccess;
  /** Overrides the default "not allowed" notice. */
  forbidden?: string;
}): Promise<
  | { scope: StaffScope; fallback: null }
  | { scope: null; fallback: ReactElement }
> {
  try {
    return { scope: await checkAccess(options.access), fallback: null };
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    const message =
      error.code === "UNAUTHORIZED"
        ? options.signedOut
        : (options.forbidden ?? forbiddenMessage(options.access));
    return { scope: null, fallback: <BackofficeNotice message={message} /> };
  }
}

/**
 * Session → companyId/userId → selected location, the sequence every
 * location-scoped Backoffice page starts with. Pages don't redirect when
 * something is missing — they render a notice in place — so this hands
 * back either the context or that notice:
 *
 *   const { context, fallback } = await requireBackofficeContext({
 *     signedOut: "Please sign in to view orders.",
 *   });
 *   if (!context) return fallback;
 *
 * `access` (default "staff") is checked first — requireBackofficeAccess —
 * before the location, so a manager is never asked to pick one for a
 * page they can't open.
 *
 * Lives in lib/ next to getSessionContext for the same reason: reading
 * the session is a Controller-layer concern (Rule 1).
 */
export async function requireBackofficeContext(messages: {
  signedOut: string;
  noLocation?: string;
  access?: PageAccess;
  /** Overrides the default "not allowed" notice. */
  forbidden?: string;
}): Promise<
  | { context: BackofficeContext; fallback: null }
  | { context: null; fallback: ReactElement }
> {
  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: messages.signedOut,
    access: messages.access ?? "staff",
    forbidden: messages.forbidden,
  });
  if (!scope) return { context: null, fallback };
  const { companyId, userId, role } = scope;

  // The same lookup the actions' `withLocation` guards use; a page shows
  // its notice instead of throwing. A selected location that isn't the
  // session company's reads as "no location selected"
  // (LocationService.getSelectedLocation).
  let locationId: number;
  try {
    ({ locationId } = await withSelectedLocation(scope));
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== "NO_SELECTED_LOCATION") {
      throw error;
    }
    return {
      context: null,
      fallback: (
        <BackofficeNotice
          message={
            messages.noLocation ??
            "No location selected. Please choose a location first."
          }
        />
      ),
    };
  }

  return {
    context: { userId, companyId, role, location: { locationId } },
    fallback: null,
  };
}
