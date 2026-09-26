import { NotFoundError } from "../lib/errors";
import type { Prisma } from "../../../prisma/generated/client";

type Tx = Prisma.TransactionClient;

/**
 * Reads today's Menu/Addon prices for stamping onto a new Order/
 * OrdersAddon row as its permanent unitPrice snapshot (see those
 * columns' own schema comments) — this is the ONLY reason to ever
 * read Menu.price/Addon.price for something that becomes an order
 * line; once a line exists, its price comes from unitPrice, never
 * read again from here. Every create site (addItemToCart,
 * addDraftItem, and updateItemInCart/updateDraftItem's new addon
 * rows) shares this one lookup, run inside the SAME transaction as
 * the create, instead of each duplicating its own Menu/Addon query.
 */
export class PriceSnapshotService {
  static async loadCurrentPrices(
    tx: Tx,
    menuId: number,
    addonIds: readonly number[],
  ) {
    const menu = await tx.menu.findFirst({ where: { id: menuId } });
    if (!menu) throw new NotFoundError("Menu", menuId);

    const uniqueAddonIds = [...new Set(addonIds)];
    const addons = await tx.addon.findMany({
      where: { id: { in: uniqueAddonIds } },
    });
    if (addons.length !== uniqueAddonIds.length) {
      const foundIds = new Set(addons.map((addon) => addon.id));
      const missingId = uniqueAddonIds.find((id) => !foundIds.has(id));
      throw new NotFoundError("Addon", missingId!);
    }

    return {
      menuPrice: menu.price,
      addonPrices: new Map(addons.map((addon) => [addon.id, addon.price])),
    };
  }
}
