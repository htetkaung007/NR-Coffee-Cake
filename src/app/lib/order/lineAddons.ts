import type { LineAddon } from "@/app/lib/order/orderTotals";

/* Client-safe on purpose (the Table draft screens map an action's line
 * with it): kept apart from roundLine.ts, whose line mappers re-base
 * image URLs with server-only config. */

/** An OrdersAddon link as fetched with its addon (for the name). */
export interface LineAddonSource {
  addonId: number;
  unitPrice: number;
  addon: {
    name: string;
    nameMy?: string | null;
    addonCategory?: { name: string; nameMy?: string | null } | null;
  };
}

/** A line's addon links as the client-side LineAddon shape — the
 *  link's own price snapshot (OrdersAddon.unitPrice), never
 *  Addon.price, same as the line's own unitPrice. The one place this
 *  mapping lives, so every cart/draft/round line carries prices the
 *  same way. */
export function toLineAddons(links: readonly LineAddonSource[]): LineAddon[] {
  return links.map((link) => ({
    id: link.addonId,
    name: link.addon.name,
    nameMy: link.addon.nameMy ?? null,
    groupName: link.addon.addonCategory?.name ?? null,
    groupNameMy: link.addon.addonCategory?.nameMy ?? null,
    unitPrice: link.unitPrice,
  }));
}
