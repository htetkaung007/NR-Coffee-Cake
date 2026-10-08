"use client";

import { createContext, useContext } from "react";
import {
  canAccess,
  type AccessRule,
  type PermissionKey,
} from "@/app/lib/access/permissions";
import type { StaffRole } from "@/app/lib/access/rolePolicy";

interface StaffAccess {
  role: StaffRole;
  /** A manager's grants (empty for the owner — never checked). */
  permissions: readonly PermissionKey[];
}

// Least privilege until the layout provides the real values.
const StaffAccessContext = createContext<StaffAccess>({
  role: "MANAGER",
  permissions: [],
});

/**
 * The signed-in user's role and grants for the Backoffice's DISPLAY
 * hints — hiding a sidebar item, disabling a switch with "Ask the owner…".
 * Loaded on the server by the Backoffice layout on every request. Never a
 * security boundary: every Server Action, page and route checks again
 * on the server (lib/access/roleGuard).
 */
export function StaffAccessProvider({
  role,
  permissions,
  children,
}: StaffAccess & { children: React.ReactNode }) {
  return (
    <StaffAccessContext.Provider value={{ role, permissions }}>
      {children}
    </StaffAccessContext.Provider>
  );
}

/** Display only: a check for any rule (see canAccess) — e.g. to filter
 *  a list of sidebar items. */
export function useAccessCheck(): (rule: AccessRule) => boolean {
  const { role, permissions } = useContext(StaffAccessContext);
  return (rule) => canAccess(role, permissions, rule);
}

/** Display only: may the signed-in user do this (see canAccess)? */
export function useCan(rule: AccessRule): boolean {
  return useAccessCheck()(rule);
}
