import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { InsufficientStockError } from "../lib/errors";

/**
 * Location-scoped menu stock. The same menu can have different stock at
 * different locations, mirroring the DisableLocationMenus pattern used
 * for menu visibility.
 */
export class MenuStockService {

  /**
   * The menu card's on/off switch — marks the menu available or not AT
   * THIS LOCATION only (sold out for today, the machine is down).
   * Independent of quantity: a menu can have stock left but still be
   * switched off. Sets the value it is given instead of flipping the
   * stored one, so two people pressing at once can't undo each other.
   * Upserts because a location may never have had a stock row; a new
   * row starts at quantity 0 (the column default).
   */
  static async setManualDisabled(
    menuId: number,
    locationId: number,
    isDisabled: boolean,
  ) {
    return prisma.menuStock.upsert({
      where: { menuId_locationId: { menuId, locationId } },
      update: { isManuallyDisabled: isDisabled },
      create: { menuId, locationId, quantity: 0, isManuallyDisabled: isDisabled },
    });
  }

  /**
   * Race-condition-safe decrement for when an order is placed.
   *
   * Read-check-write done as three separate steps would let two concurrent
   * orders both read "1 left", both pass the check, and both decrement —
   * overselling the last item. Folding the check into the WHERE clause
   * makes the database perform the check-and-write as one atomic operation,
   * so a second concurrent call sees the already-updated row and its WHERE
   * clause fails instead of racing.
   *
   * Requires a transaction client — decrementing stock only ever makes
   * sense as part of actually creating the order that consumes it (see
   * the "decrement at submit, not at add-to-cart/draft" design
   * discussion), so every call site is already inside a
   * prisma.$transaction and should be decrementing there, not against
   * the global client — a decrement that "succeeded" outside the same
   * transaction as the order creation could leave stock decremented
   * for an order that then fails to create for an unrelated reason.
   */
  static async decrementStock(
    tx: Prisma.TransactionClient,
    menuId: number,
    menuName: string,
    locationId: number,
    amount: number,
  ) {
    const result = await tx.menuStock.updateMany({
      where: {
        menuId,
        locationId,
        quantity: { gte: amount },
      },
      data: {
        quantity: { decrement: amount },
      },
    });

    if (result.count === 0) {
      const stock = await tx.menuStock.findFirst({
        where: { menuId, locationId },
      });
      throw new InsufficientStockError(menuName, stock?.quantity ?? 0);
    }
  }

  /**
   * Informational pre-check — NOT the real guard (decrementStock's own
   * atomic WHERE clause is, at actual submit time). Used to show a
   * customer "only 2 left" / "sold out" against their current
   * draft/cart quantities *before* they try to submit, and after
   * every draft poll tick, without needing to attempt (and roll back)
   * a real transaction just to find out. Requests should already be
   * merged per menu (one entry per menuId) — the caller (e.g.
   * TableDraftService.getShortagesForTable) owns that merge, same as
   * submitDraft's own group-by-menu step.
   */
  static async findShortages(
    locationId: number,
    requests: { menuId: number; menuName: string; quantity: number }[],
  ) {
    if (requests.length === 0) return [];

    const menuIds = requests.map((request) => request.menuId);
    const stocks = await prisma.menuStock.findMany({
      where: { menuId: { in: menuIds }, locationId },
    });
    const availableByMenuId = new Map(
      stocks.map((stock) => [stock.menuId, stock.quantity]),
    );

    return requests
      .map((request) => ({
        menuId: request.menuId,
        menuName: request.menuName,
        requested: request.quantity,
        available: availableByMenuId.get(request.menuId) ?? 0,
      }))
      .filter((shortage) => shortage.requested > shortage.available);
  }

  /** Restock — plain increment, no race condition risk (no lower bound
   *  to race against). Takes a transaction client for the same reason
   *  decrementStock does: its only caller (OrderSessionService.
   *  cancelSession) gives stock back as part of cancelling a round, and
   *  the two must commit or roll back together. */
  static async incrementStock(
    tx: Prisma.TransactionClient,
    menuId: number,
    locationId: number,
    amount: number,
  ) {
    return tx.menuStock.upsert({
      where: { menuId_locationId: { menuId, locationId } },
      update: { quantity: { increment: amount } },
      create: { menuId, locationId, quantity: amount },
    });
  }
}
