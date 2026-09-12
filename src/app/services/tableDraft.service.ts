import { NotFoundError, ValidationError } from "@/app/lib/errors";
import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../prisma/generated/client";
import { getTokenEpoch } from "../lib/contributorToken";
import { MenuStockService } from "./menuStock.service";
import { generateOrderNumber } from "./orderService/orderSession.service";
import { OrderSessionCartService } from "./orderService/orderSessionCart.service";

type Tx = Prisma.TransactionClient;

/**
 * Table-QR "draft" line items — see the per-customer draft design
 * discussion. Before "Send to Kitchen", every contributor's picks are
 * plain Order rows with orderSessionId = null, owned by
 * (tableId, contributorToken) rather than any session. Deliberately
 * reuses the Order/OrdersAddon tables instead of a separate model
 * (see the design discussion for why a second near-identical table
 * would just be Order duplicated) — a draft becomes a "real" line
 * item the moment submitDraft merges and attaches it to a freshly
 * created OrderSession.
 *
 * Counter QR never touches this class — each Counter phone still goes
 * straight through OrderSessionCartService.addItemToCart into an
 * already-existing session, exactly as before this feature existed.
 */
export class TableDraftService {
  /** A contributor token being present (see getContributorToken) isn't
   *  enough on its own once a table can be paid and reopened for a new
   *  group — see Table.contributorEpoch's own comment. Every call site
   *  that actually acts on a token (not just checks whether a cookie
   *  entry exists) calls this first; customer/action.ts's
   *  requireContributorToken and pollTableAction both throw/report
   *  "not authorized" the same way for a missing token and a stale
   *  one, since both mean "this browser isn't currently part of this
   *  table's order" from the caller's point of view. */
  static async isTokenCurrentForTable(tableId: number, rawToken: string) {
    const tokenEpoch = getTokenEpoch(rawToken);
    if (tokenEpoch === null) return false;

    const table = await prisma.table.findFirst({
      where: { id: tableId, isArchived: false },
      select: { contributorEpoch: true },
    });
    return table !== null && table.contributorEpoch === tokenEpoch;
  }

  /** Ownership isn't checked here (adding is never a conflict the way
   *  removing is) — contributorToken is just stamped onto the new row
   *  so a LATER remove/edit can check it. Reuses
   *  OrderSessionCartService's required-addon validation rather than a
   *  second copy — the rule ("every required category needs a pick")
   *  doesn't care whether the row it's about to attach to is a draft
   *  or an already-submitted session's item. */
  static async addDraftItem(
    tableId: number,
    contributorToken: string,
    menuId: number,
    quantity: number,
    addonIds: number[] = [],
  ) {
    await OrderSessionCartService.validateAddonSelection(menuId, addonIds);

    return prisma.$transaction(async (tx: Tx) => {
      const order = await tx.order.create({
        data: {
          menuId,
          quantity,
          tableId,
          orderSessionId: null,
          contributorToken,
        },
      });

      if (addonIds.length > 0) {
        await tx.ordersAddon.createMany({
          data: addonIds.map((addonId) => ({ orderId: order.id, addonId })),
        });
      }

      return order;
    });
  }

  /** The real security boundary here — same reasoning as
   *  OrderSessionCartService.removeItemFromCart's ownership check: a
   *  customer's own contributorToken must match the row's, so one
   *  contributor can never remove another's draft pick even though
   *  everyone at the table can see the full draft list (see
   *  getDraftItemsForTable). orderSessionId: null in the lookup means
   *  an already-submitted (merged) row can never be "removed" through
   *  this path — only a still-draft one. */
  static async removeDraftItem(contributorToken: string, orderId: number) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, orderSessionId: null },
    });
    if (!order) {
      throw new NotFoundError("Order", orderId);
    }
    if (order.contributorToken !== contributorToken) {
      throw new ValidationError("This item belongs to someone else.");
    }

    await prisma.$transaction(async (tx: Tx) => {
      await tx.ordersAddon.deleteMany({ where: { orderId } });
      await tx.order.delete({ where: { id: orderId } });
    });
  }

  /** Same ownership boundary as removeDraftItem — a customer can only
   *  edit their own draft pick. Replaces the addon links wholesale
   *  (delete then recreate) rather than diffing old vs new, same
   *  reasoning as removeDraftItem needing the delete-then-delete
   *  order for the foreign key: simpler and the addon set is small
   *  enough that a diff wouldn't meaningfully save work. */
  static async updateDraftItem(
    contributorToken: string,
    orderId: number,
    quantity: number,
    addonIds: number[] = [],
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, orderSessionId: null },
    });
    if (!order) {
      throw new NotFoundError("Order", orderId);
    }
    if (order.contributorToken !== contributorToken) {
      throw new ValidationError("This item belongs to someone else.");
    }

    await OrderSessionCartService.validateAddonSelection(
      order.menuId,
      addonIds,
    );

    return prisma.$transaction(async (tx: Tx) => {
      await tx.ordersAddon.deleteMany({ where: { orderId } });
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { quantity },
      });
      if (addonIds.length > 0) {
        await tx.ordersAddon.createMany({
          data: addonIds.map((addonId) => ({ orderId, addonId })),
        });
      }
      return updated;
    });
  }

  /** Everyone at the table sees the FULL draft list, not just their
   *  own picks — the UI groups rows by contributorToken to decide
   *  which get Edit/Cancel vs read-only (design mock's "Customer 1
   *  order" / "Customer 2 order" split). */
  static async getDraftItemsForTable(tableId: number) {
    return prisma.order.findMany({
      where: { tableId, orderSessionId: null, isArchived: false },
      orderBy: { id: "asc" },
      include: { menu: true, OrdersAddons: { include: { addon: true } } },
    });
  }

  /** Informational — see MenuStockService.findShortages's own comment
   *  on why this isn't the real guard (submitDraft's atomic
   *  decrementStock is). Merges draft quantities per menu first (same
   *  merge submitDraft itself does) since stock is checked per menu,
   *  not per individual contributor's line — two contributors each
   *  drafting 1 of the last 1-in-stock item is already a shortage
   *  even though neither alone would be. Called from pollTableAction
   *  so the draft review screen can show "only 1 left" / "sold out"
   *  against the table's CURRENT combined picks on every poll tick,
   *  not just at submit time. */
  static async getShortagesForTable(tableId: number, locationId: number) {
    const draftItems = await prisma.order.findMany({
      where: { tableId, orderSessionId: null, isArchived: false },
      include: { menu: true },
    });

    const requestedByMenuId = new Map<
      number,
      { menuId: number; menuName: string; quantity: number }
    >();
    for (const item of draftItems) {
      const existing = requestedByMenuId.get(item.menuId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        requestedByMenuId.set(item.menuId, {
          menuId: item.menuId,
          menuName: item.menu.name,
          quantity: item.quantity,
        });
      }
    }

    return MenuStockService.findShortages(
      locationId,
      Array.from(requestedByMenuId.values()),
    );
  }

  /**
   * "Send to Kitchen" — merges every contributor's draft picks for
   * this table into one round. Identical (menu, addon set) rows from
   * different contributors collapse into a single row with summed
   * quantity, so the counter sees e.g. "Coffee × 2" as one line
   * straight from the database — no display-time aggregation needed
   * on that side (see OrderListView's ItemList, unchanged by this).
   * The draft rows are deleted once merged (they're staging, not
   * history); the merged rows attached to the new OrderSession are
   * the real record from here on, same as any Order row always was.
   *
   * Stock is decremented HERE, not at addDraftItem (see the "decrement
   * at submit, not at add-to-cart/draft" design discussion) — inside
   * the same transaction as the round's own creation, so a shortage
   * for even one menu rolls back the WHOLE submit (no round gets
   * created, no draft rows get deleted) rather than partially
   * succeeding. getShortagesForTable is the informational pre-check a
   * customer sees before they even try to submit; this atomic
   * decrement is what actually enforces it.
   *
   * Reused for every later round, not just the first — with drafts
   * decoupled from any session, "Order More" after a round is
   * Accepted is just adding more drafts and calling this again; there
   * is no separate startNextRound-style method for Table QR anymore
   * (Counter QR still has its own — see OrderSessionService.
   * startNextRound — since Counter never had drafts to begin with).
   */
  static async submitDraft(
    tableId: number,
    locationId: number,
    isCounter: boolean,
  ) {
    const draftItems = await prisma.order.findMany({
      where: { tableId, orderSessionId: null, isArchived: false },
      include: { OrdersAddons: true, menu: true },
    });
    if (draftItems.length === 0) {
      throw new ValidationError("Nothing to submit yet.");
    }

    const groups = new Map<
      string,
      {
        menuId: number;
        menuName: string;
        quantity: number;
        addonIds: number[];
      }
    >();
    for (const item of draftItems) {
      const addonIds = item.OrdersAddons.map((link) => link.addonId).sort(
        (a, b) => a - b,
      );
      const key = `${item.menuId}:${addonIds.join(",")}`;
      const existing = groups.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        groups.set(key, {
          menuId: item.menuId,
          menuName: item.menu.name,
          quantity: item.quantity,
          addonIds,
        });
      }
    }

    return prisma.$transaction(async (tx: Tx) => {
      const session = await tx.orderSession.create({
        data: {
          locationId,
          tableId,
          isCounter,
          status: "PENDING_APPROVAL",
          orderNumber: "",
        },
      });
      const numbered = await tx.orderSession.update({
        where: { id: session.id },
        data: { orderNumber: generateOrderNumber(session.id) },
      });

      const draftIds = draftItems.map((item) => item.id);
      await tx.ordersAddon.deleteMany({
        where: { orderId: { in: draftIds } },
      });
      await tx.order.deleteMany({ where: { id: { in: draftIds } } });

      // One menu's worth of stock at a time — grouped by (menu, addon
      // set), so a shortage's error names the actual menu, not a
      // per-contributor line the customer wouldn't recognize.
      const consumedByMenuId = new Map<number, number>();
      const menuNameByMenuId = new Map<number, string>();
      for (const group of groups.values()) {
        consumedByMenuId.set(
          group.menuId,
          (consumedByMenuId.get(group.menuId) ?? 0) + group.quantity,
        );
        menuNameByMenuId.set(group.menuId, group.menuName);
      }
      for (const [menuId, quantity] of consumedByMenuId) {
        await MenuStockService.decrementStock(
          tx,
          menuId,
          menuNameByMenuId.get(menuId)!,
          locationId,
          quantity,
        );
      }

      for (const group of groups.values()) {
        const merged = await tx.order.create({
          data: {
            menuId: group.menuId,
            quantity: group.quantity,
            tableId,
            orderSessionId: numbered.id,
          },
        });
        if (group.addonIds.length > 0) {
          await tx.ordersAddon.createMany({
            data: group.addonIds.map((addonId) => ({
              orderId: merged.id,
              addonId,
            })),
          });
        }
      }

      await tx.table.update({
        where: { id: tableId },
        data: { activeSessionId: numbered.id },
      });

      return numbered;
    });
  }
}
