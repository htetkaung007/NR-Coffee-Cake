import { NotFoundError, ValidationError } from "@/app/lib/errors";
import { normalizeOrderNote } from "@/app/lib/orderNote";
import { lineMergeKey } from "@/app/lib/orderLineMerge";
import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import { PriceSnapshotService } from "../priceSnapshot.service";

type Tx = Prisma.TransactionClient;

/**
 * Cart-building — everything that mutates a session's line items
 * while it's still CART (before "Submit Order"). Split out from
 * orderSession.service.ts (2026 refactor) as its own concern, distinct
 * from session/token lookup (orderSessionLookup.service.ts) and the
 * CART -> PENDING/PENDING_APPROVAL transition itself
 * (orderSessionSubmit.service.ts).
 */
export class OrderSessionCartService {
  /** addonIds is the FLAT list of every addon the customer picked
   *  across all of this menu's addon categories (required + optional
   *  combined) — the client doesn't need to group them by category to
   *  call this, but the SERVER re-derives the grouping from
   *  MenuAddonCategories to validate required-category selection.
   *  This validation is a security boundary, not just UX polish: the
   *  client-side "Add to Cart" button being disabled until required
   *  categories are picked can be bypassed by anyone calling this
   *  action directly, so the real enforcement has to live here (same
   *  reasoning as requireSessionFromCookie in customer/menu/action.ts).
   *
   *  Identical lines merge: if THIS session's cart already has a line
   *  that is the same line — same menu, same add-on set, same note as
   *  far as lineMergeKey (lib/orderLineMerge.ts, the rule Table QR's
   *  submitDraft also uses) can tell — its quantity goes up by
   *  `quantity` and that line is returned; otherwise a new line is
   *  created. Only ever within one session, never across customers.
   *  The existing line keeps its note as first typed. Stock is still
   *  only checked at submit, and editing a line (updateItemInCart)
   *  never merges it into another. */
  static async addItemToCart(
    sessionId: number,
    tableId: number,
    menuId: number,
    quantity: number,
    addonIds: number[] = [],
    note?: string,
  ) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);
    if (session.status !== "CART") {
      throw new ValidationError("This order can no longer be edited.");
    }

    await OrderSessionCartService.validateAddonSelection(menuId, addonIds);

    return prisma.$transaction(async (tx: Tx) => {
      const { menuPrice, addonPrices } =
        await PriceSnapshotService.loadCurrentPrices(tx, menuId, addonIds);
      const incomingAddons = addonIds.map((addonId) => ({
        addonId,
        unitPrice: addonPrices.get(addonId)!,
      }));
      const incomingKey = lineMergeKey(menuId, menuPrice, incomingAddons, note);
      const sameMenuLines = await tx.order.findMany({
        where: { orderSessionId: sessionId, menuId, isArchived: false },
        include: { OrdersAddons: true },
      });
      const sameLine = sameMenuLines.find(
        (line) =>
          lineMergeKey(
            line.menuId,
            line.unitPrice,
            line.OrdersAddons.map((link) => ({
              addonId: link.addonId,
              unitPrice: link.unitPrice,
            })),
            line.note,
          ) === incomingKey,
      );
      if (sameLine) {
        return tx.order.update({
          where: { id: sameLine.id },
          data: { quantity: { increment: quantity } },
        });
      }

      const order = await tx.order.create({
        data: {
          menuId,
          quantity,
          tableId,
          orderSessionId: sessionId,
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

      return order;
    });
  }

  /** Ownership check (orderId belongs to sessionId) is the real
   *  security boundary here — same reasoning as requireSessionFromCookie
   *  elsewhere: the caller (a Server Action) only knows the orderId the
   *  UI passed it, which a customer's browser controls, so this method
   *  can't trust that number alone. Also refuses anything not CART, same
   *  as addItemToCart, so a line can't be pulled out of an order that's
   *  already mid-approval or further. OrdersAddon has no cascade delete
   *  configured (schema's Order relation is the default Restrict), so
   *  those rows are deleted explicitly first, in the same transaction —
   *  deleting the Order first would fail on the foreign key instead. */
  static async removeItemFromCart(sessionId: number, orderId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);
    if (session.status !== "CART") {
      throw new ValidationError("This order can no longer be edited.");
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, orderSessionId: sessionId },
    });
    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    await prisma.$transaction(async (tx: Tx) => {
      await tx.ordersAddon.deleteMany({ where: { orderId } });
      await tx.order.delete({ where: { id: orderId } });
    });
  }

  /** Same ownership+status boundary as removeItemFromCart (orderId
   *  must belong to sessionId, session must still be CART), combined
   *  with TableDraftService.updateDraftItem's replace-wholesale addon
   *  logic (delete then recreate rather than diffing old vs new — the
   *  addon set is small enough that a diff wouldn't meaningfully save
   *  work). Table QR's draft rows and Counter's session cart rows are
   *  both just Order rows (see TableDraftService's class comment), so
   *  this is the Counter-session-scoped twin of updateDraftItem rather
   *  than a new concept. */
  static async updateItemInCart(
    sessionId: number,
    orderId: number,
    quantity: number,
    addonIds: number[] = [],
    note?: string,
  ) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);
    if (session.status !== "CART") {
      throw new ValidationError("This order can no longer be edited.");
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, orderSessionId: sessionId },
    });
    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    await OrderSessionCartService.validateAddonSelection(
      order.menuId,
      addonIds,
    );

    return prisma.$transaction(async (tx: Tx) => {
      await tx.ordersAddon.deleteMany({ where: { orderId } });
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { quantity, note: normalizeOrderNote(note) },
      });
      if (addonIds.length > 0) {
        // New picks get TODAY's addon price; the line's own unitPrice
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
      return updated;
    });
  }

  /** Every required addon category linked to this menu (see
   *  MenuAddonCategories) must have AT LEAST ONE of its own addons
   *  present in the given addonIds — same rule the client-side radio
   *  group enforces, re-checked here since a client can't be trusted
   *  to have actually enforced it (see addItemToCart's comment).
   *  Doesn't check that every id in addonIds actually belongs to this
   *  menu's addon categories — a stray/unrelated addon id just gets
   *  attached to the order harmlessly, no different in kind from a
   *  customer being able to pick any menu's addons today. */
  static async validateAddonSelection(menuId: number, addonIds: number[]) {
    const requiredCategoryLinks = await prisma.menuAddonCategories.findMany({
      where: {
        menuId,
        isArchived: false,
        addonCategory: { isRequired: true, isArchived: false },
      },
      include: {
        addonCategory: {
          include: { addons: { where: { isArchived: false } } },
        },
      },
    });

    for (const link of requiredCategoryLinks) {
      const categoryAddonIds = new Set(
        link.addonCategory.addons.map((addon) => addon.id),
      );
      const hasSelection = addonIds.some((id) => categoryAddonIds.has(id));
      if (!hasSelection) {
        throw new ValidationError(
          `Please choose an option for "${link.addonCategory.name}".`,
        );
      }
    }
  }
}
