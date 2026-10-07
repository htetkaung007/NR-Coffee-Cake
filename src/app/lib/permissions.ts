/** What an owner can let a MANAGER do — the ONE catalog both the
 *  enforcement and the Settings screen read. Pure and client-safe: the
 *  Prisma enum is imported as a TYPE only (for the check at the bottom).
 *
 *  An ADMIN (owner) can do everything and is never checked against
 *  grants. A MANAGER can always take and manage orders (ALWAYS_ALLOWED),
 *  can never do the owner-only things (OWNER_ONLY), and in between can
 *  do exactly what the owner has ticked (GRANTABLE_PERMISSIONS, stored as
 *  UserPermission rows). */

import type { Permission } from "../../../prisma/generated/enums";
import type { StaffRole } from "./rolePolicy";

export type PermissionGroup = "Orders" | "Daily" | "Tables" | "Business";

/** Everything an owner can tick for a manager, in the order shown. */
export const GRANTABLE_PERMISSIONS = [
  {
    key: "ORDERS_MARK_PAID",
    group: "Orders",
    label: "Mark bills as paid",
    description: "Take payment and close a table or counter bill.",
    defaultForNewManager: true,
  },
  {
    key: "MENU_AVAILABILITY",
    group: "Daily",
    label: "Turn menus on/off",
    description: "Mark a menu sold out or back on at their location.",
    defaultForNewManager: true,
  },
  {
    key: "ADDON_AVAILABILITY",
    group: "Daily",
    label: "Turn add-ons on/off",
    description: "e.g. out of oat milk.",
    defaultForNewManager: true,
  },
  {
    key: "TABLES_MANAGE",
    group: "Tables",
    label: "Manage tables and QR codes",
    description: "Create, rename and delete tables; print QR codes.",
    defaultForNewManager: false,
  },
  {
    key: "REPORTS_VIEW",
    group: "Business",
    label: "View reports",
    description: "Sales reports and CSV/PDF export.",
    defaultForNewManager: false,
  },
] as const satisfies readonly {
  key: string;
  group: PermissionGroup;
  label: string;
  description: string;
  defaultForNewManager: boolean;
}[];

/** One grantable permission ("ORDERS_MARK_PAID", …). */
export type PermissionKey = (typeof GRANTABLE_PERMISSIONS)[number]["key"];

/** What a manager without a permission is told where its control sits
 *  disabled (display only — the server refuses anyway). */
export const ASK_OWNER_HINTS = {
  ORDERS_MARK_PAID: "Ask the owner to let you take payment",
  MENU_AVAILABILITY: "Ask the owner to let you turn menus on/off",
  ADDON_AVAILABILITY: "Ask the owner to let you turn add-ons on/off",
} as const satisfies Partial<Record<PermissionKey, string>>;

/** What every manager can always do — for display. */
export const ALWAYS_ALLOWED = [
  "Take orders, and accept or reject them",
  "Place a new order",
  "See order history",
] as const;

/** What only the owner can ever do — never grantable. For display. */
export const OWNER_ONLY = [
  "Locations",
  "Managers & permissions",
  "Company settings",
  "Menu setup — create, edit and delete menus and prices",
  "Menu categories",
  "Add-on groups — options, prices, Required",
] as const;

/** What a new manager (and every manager when this was introduced) gets. */
export const DEFAULT_MANAGER_PERMISSIONS: readonly PermissionKey[] =
  GRANTABLE_PERMISSIONS.filter((entry) => entry.defaultForNewManager).map(
    (entry) => entry.key,
  );

/** May this person do `needed`? An owner always; a manager only if the
 *  owner granted it. */
export function hasPermission(
  role: StaffRole,
  granted: readonly PermissionKey[],
  needed: PermissionKey,
): boolean {
  return role === "ADMIN" || granted.includes(needed);
}

/** Who may open a page or use a control: any signed-in staff, the
 *  owner only, or the owner plus managers granted that permission. */
export type AccessRule = "staff" | "owner" | PermissionKey;

/** THE access rule — pages, the sidebar and display hints all ask this
 *  (the server checks run the same rule through lib/roleGuard). */
export function canAccess(
  role: StaffRole,
  granted: readonly PermissionKey[],
  rule: AccessRule,
): boolean {
  if (rule === "staff") return true;
  if (rule === "owner") return role === "ADMIN";
  return hasPermission(role, granted, rule);
}

/** The catalog's keys, in order — e.g. for `z.enum(PERMISSION_KEYS)`. */
export const PERMISSION_KEYS = GRANTABLE_PERMISSIONS.map((entry) => entry.key) as [
  PermissionKey,
  ...PermissionKey[],
];

const KEYS: ReadonlySet<string> = new Set(PERMISSION_KEYS);

/** What saving `next` over a manager's `current` grants must do: add the
 *  newly ticked, remove the no-longer ticked — nothing else, so unchanged
 *  grants keep their row (and its createdAt / grantedBy history).
 *  Duplicates in `next` count once. */
export function permissionChanges(
  current: readonly PermissionKey[],
  next: readonly PermissionKey[],
): { add: PermissionKey[]; remove: PermissionKey[] } {
  const wanted = new Set(next);
  const had = new Set(current);
  return {
    add: [...wanted].filter((key) => !had.has(key)),
    remove: [...had].filter((key) => !wanted.has(key)),
  };
}

/** A string is one of the catalog's keys (for validating input). */
export function isPermissionKey(value: string): value is PermissionKey {
  return KEYS.has(value);
}

// Compile-time: the catalog's keys are EXACTLY the Prisma enum's values —
// adding a Permission without a catalog entry (or the other way round)
// fails tsc.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const CATALOG_MATCHES_SCHEMA: Exact<PermissionKey, Permission> = true;
void CATALOG_MATCHES_SCHEMA;
