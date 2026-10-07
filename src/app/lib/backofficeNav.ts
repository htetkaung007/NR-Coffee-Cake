import type { Session } from "next-auth";
import type { AccessRule } from "./permissions";

export type NavRole = Session["user"]["role"];

/**
 * The href of the ONE nav item to highlight for this path: the longest
 * href that equals the path or is a whole-segment prefix of it. So
 * /backoffice/order/new picks "New order" (not also "Orders"), while
 * /backoffice/order/history still picks "Orders".
 */
export function findActiveHref(
  pathname: string | null,
  hrefs: readonly string[],
): string | null {
  if (!pathname) return null;
  let active: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (active === null || href.length > active.length)) {
      active = href;
    }
  }
  return active;
}

/** Items the user may open (`isAllowed(item.access)` — the shared
 *  canAccess rule); a section left with no items is dropped entirely (no
 *  orphan caption). */
export function visibleNavSections<
  Section extends { items: readonly { access: AccessRule }[] },
>(
  sections: readonly Section[],
  isAllowed: (rule: AccessRule) => boolean,
): (Section & { items: Section["items"][number][] })[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isAllowed(item.access)),
    }))
    .filter((section) => section.items.length > 0);
}
