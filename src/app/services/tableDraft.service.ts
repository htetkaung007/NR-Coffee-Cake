import { NotFoundError, ValidationError } from "@/app/lib/errors";
import { normalizeOrderNote } from "@/app/lib/orderNote";
import { groupDraftsForSubmit, lineMergeKey } from "@/app/lib/orderLineMerge";
import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../prisma/generated/client";
import { getTokenEpoch } from "../lib/contributorToken";
import { contributorLabelsById } from "../lib/contributors";
import { MenuStockService } from "./menuStock.service";
import { PriceSnapshotService } from "./priceSnapshot.service";
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
   *  or an already-submitted session's item.
   *
   *  Identical picks merge PER CUSTOMER: if this same contributorToken
   *  already has a draft at this table that is the same line (same
   *  menu, add-on set and note as far as lineMergeKey — the rule
   *  submitDraft and Counter's addItemToCart use — can tell), its
   *  quantity goes up and that row is returned; otherwise a new draft
   *  is created. Never into another customer's draft: each row is owned
   *  by one token (removeDraftItem/updateDraftItem check it), so a
   *  shared row would let one customer remove another's item. Identical
   *  picks by different customers stay separate rows — before AND after
   *  Send to Kitchen (submitDraft merges per customer only). */
  static async addDraftItem(
    tableId: number,
    contributorToken: string,
    menuId: number,
    quantity: number,
    addonIds: number[] = [],
    note?: string,
  ) {
    await OrderSessionCartService.validateAddonSelection(menuId, addonIds);

    return prisma.$transaction(async (tx: Tx) => {
      const { menuPrice, addonPrices } =
        await PriceSnapshotService.loadCurrentPrices(tx, menuId, addonIds);
      const incomingAddons = addonIds.map((addonId) => ({
        addonId,
        unitPrice: addonPrices.get(addonId)!,
      }));
      const incomingKey = lineMergeKey(menuId, menuPrice, incomingAddons, note);
      const ownSameMenuDrafts = await tx.order.findMany({
        where: {
          tableId,
          orderSessionId: null,
          contributorToken,
          menuId,
          isArchived: false,
        },
        include: { OrdersAddons: true },
      });
      const sameLine = ownSameMenuDrafts.find(
        (draft) =>
          lineMergeKey(
            draft.menuId,
            draft.unitPrice,
            draft.OrdersAddons.map((link) => ({
              addonId: link.addonId,
              unitPrice: link.unitPrice,
            })),
            draft.note,
          ) === incomingKey,
      );
      if (sameLine) {
        await tx.order.update({
          where: { id: sameLine.id },
          data: { quantity: { increment: quantity } },
        });
        return OrderSessionCartService.getLineWithAddons(tx, sameLine.id);
      }

      const order = await tx.order.create({
        data: {
          menuId,
          quantity,
          tableId,
          orderSessionId: null,
          contributorToken,
          note: normalizeOrderNote(note),
          unitPrice: menuPrice,
        },
      });

      if (addonIds.length > 0) {
        await tx.ordersAddon.createMany({
          data: incomingAddons.map(({ addonId, unitPrice }) => ({
            orderId: order.id,
            addonId,
            unitPrice,
          })),
        });
      }

      return OrderSessionCartService.getLineWithAddons(tx, order.id);
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
    note?: string,
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
      await tx.order.update({
        where: { id: orderId },
        data: { quantity, note: normalizeOrderNote(note) },
      });
      if (addonIds.length > 0) {
        // New picks get TODAY's addon price; the draft's own unitPrice
        // above is untouched — see Order.unitPrice's own schema comment.
        const { addonPrices } = await PriceSnapshotService.loadCurrentPrices(
          tx,
          order.menuId,
          addonIds,
        );
        await tx.ordersAddon.createMany({
          data: addonIds.map((addonId) => ({
            orderId,
            addonId,
            unitPrice: addonPrices.get(addonId)!,
          })),
        });
      }
      return OrderSessionCartService.getLineWithAddons(tx, orderId);
    });
  }

  /** Everyone at the table sees the FULL draft list, not just their
   *  own picks — grouped per person (design mock's "Your order" /
   *  "Customer 2 order" split), with Edit/Cancel only on the viewer's
   *  own. The rows include contributorToken: callers turn it into
   *  labels (lib/contributors.ts) before anything reaches the client. */
  static async getDraftItemsForTable(tableId: number) {
    return prisma.order.findMany({
      where: { tableId, orderSessionId: null, isArchived: false },
      orderBy: { id: "asc" },
      include: { menu: true, OrdersAddons: { include: { addon: true } } },
    });
  }

  /** Who ordered which line, as labels ("You" / "Customer 2" — never a
   *  token): numbered over the table's WHOLE open tab — its drafts plus
   *  the lines of its open rounds (the same rounds getRoundHistoryForTable
   *  lists) — so a person has the same number on every screen and phone.
   *  One query; the tokens never leave this method. */
  static async getContributorLabels(tableId: number, myToken: string | null) {
    const rows = await prisma.order.findMany({
      where: {
        tableId,
        isArchived: false,
        OR: [
          { orderSessionId: null },
          {
            orderSession: {
              isArchived: false,
              status: { in: ["PENDING_APPROVAL", "PENDING", "COOKING"] },
            },
          },
        ],
      },
      select: { id: true, contributorToken: true },
    });
    return contributorLabelsById(rows, myToken);
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
   * "Send to Kitchen" — turns every contributor's draft picks for this
   * table into one round (groupDraftsForSubmit). Each CUSTOMER's
   * identical (menu, price, addon set, note) picks merge into one row
   * with summed quantity; different customers' picks stay separate rows,
   * each keeping its contributorToken — so every customer still sees
   * their own lines after Send. The Backoffice merges identical lines
   * for display only (mergeLinesForDisplay), so the counter still sees
   * "Coffee × 2". The note is part of "identical": two "Coffee" drafts
   * with different notes stay separate lines, and a merged line keeps
   * its note — otherwise the kitchen would lose it here. The draft rows
   * are deleted (they're staging, not history); the new rows attached
   * to the OrderSession are the real record from here on. They carry a
   * token but are never editable: removeDraftItem/updateDraftItem only
   * ever match orderSessionId = null.
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

    const { lines, stockByMenu } = groupDraftsForSubmit(
      draftItems.map((item) => ({
        contributorToken: item.contributorToken,
        menuId: item.menuId,
        menuName: item.menu.name,
        quantity: item.quantity,
        // Each draft's OWN already-snapshotted prices — never re-read
        // from Menu/Addon: a merge at submit must not repaint a price.
        unitPrice: item.unitPrice,
        addons: item.OrdersAddons.map((link) => ({
          addonId: link.addonId,
          unitPrice: link.unitPrice,
        })),
        note: item.note,
      })),
    );

    return prisma.$transaction(async (tx: Tx) => {
      // approvalExpiresAt stays NULL on purpose — never set it here.
      // expireStaleApprovals cancels ANY waiting round whose
      // approvalExpiresAt has passed (it doesn't check isCounter), and a
      // cancelled Table round can't be put back: the drafts below are
      // merged and deleted. A Table round's "due" time is a soft target
      // computed from createdAt by approvalDeadline — never stored.
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

      // Stock per menu, everyone's quantities combined — so a shortage's
      // error names the actual menu, not one person's line.
      for (const { menuId, menuName, quantity } of stockByMenu) {
        await MenuStockService.decrementStock(
          tx,
          menuId,
          menuName,
          locationId,
          quantity,
        );
      }

      // One row per customer per line, keeping whose it is (never
      // editable once submitted — see removeDraftItem).
      for (const line of lines) {
        const submitted = await tx.order.create({
          data: {
            menuId: line.menuId,
            quantity: line.quantity,
            tableId,
            orderSessionId: numbered.id,
            contributorToken: line.contributorToken,
            note: line.note,
            unitPrice: line.unitPrice,
          },
        });
        if (line.addons.length > 0) {
          await tx.ordersAddon.createMany({
            data: line.addons.map(({ addonId, unitPrice }) => ({
              orderId: submitted.id,
              addonId,
              unitPrice,
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
