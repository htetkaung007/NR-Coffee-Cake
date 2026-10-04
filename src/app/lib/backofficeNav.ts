import type { Session } from "next-auth";

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

/** Items without `roles` are shown to everyone; a section left with no
 *  items for this role is dropped entirely (no orphan caption). */
export function visibleNavSections<
  Item extends { roles?: readonly NavRole[] },
  Section extends { items: readonly Item[] },
>(sections: readonly Section[], role: NavRole): (Section & { items: Item[] })[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.roles || item.roles.includes(role),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
