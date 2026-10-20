/** What an owner can let a MANAGER do — the ONE catalog both the
 *  enforcement and the Settings screen read. Pure and client-safe: the
 *  Prisma enum is imported as a TYPE only (for the check at the bottom).
 *
 *  An ADMIN (owner) can do everything and is never checked against
 *  grants. A MANAGER can always take and manage orders (ALWAYS_ALLOWED),
 *  can never do the owner-only things (OWNER_ONLY), and in between can
 *  do exactly what the owner has ticked (GRANTABLE_PERMISSIONS, stored as
 *  UserPermission rows). */

import type { Permission } from "../../../../prisma/generated/enums";
import type { StaffRole } from "./rolePolicy";

export type PermissionGroup = "Orders" | "Daily" | "Tables" | "Business";

/** Everything an owner can tick for a manager, in the order shown. The
 *  words — label and description — are bo.permissions.<KEY> in
 *  messages/*.json (tested: every key has them in both languages). */
export const GRANTABLE_PERMISSIONS = [
  { key: "ORDERS_MARK_PAID", group: "Orders", defaultForNewManager: true },
  { key: "ORDERS_VOID", group: "Orders", defaultForNewManager: false },
  { key: "MENU_AVAILABILITY", group: "Daily", defaultForNewManager: true },
  { key: "ADDON_AVAILABILITY", group: "Daily", defaultForNewManager: true },
  { key: "TABLES_MANAGE", group: "Tables", defaultForNewManager: false },
  { key: "REPORTS_VIEW", group: "Business", defaultForNewManager: false },
] as const satisfies readonly {
  key: string;
  group: PermissionGroup;
  defaultForNewManager: boolean;
}[];

/** One grantable permission ("ORDERS_MARK_PAID", …). */
export type PermissionKey = (typeof GRANTABLE_PERMISSIONS)[number]["key"];

/** The permissions whose disabled control tells a manager to "Ask the
 *  owner …" (bo.permissions.askOwner.<KEY>; display only — the server
 *  refuses anyway). */
export const ASK_OWNER_HINT_KEYS = [
  "ORDERS_MARK_PAID",
  "MENU_AVAILABILITY",
  "ADDON_AVAILABILITY",
] as const satisfies readonly PermissionKey[];

/** What every manager can always do — for display
 *  (bo.permissions.alwaysAllowed.<KEY>). */
export const ALWAYS_ALLOWED = ["takeOrders", "placeOrder", "seeHistory"] as const;

/** What only the owner can ever do — never grantable. For display
 *  (bo.permissions.ownerOnly.<KEY>). */
export const OWNER_ONLY = [
  "locations",
  "managers",
  "company",
  "menuSetup",
  "categories",
  "addonGroups",
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
 *  (the server checks run the same rule through lib/access/roleGuard). */
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
