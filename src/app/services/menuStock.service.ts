import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { ValidationError, InsufficientStockError } from "../lib/errors";

/**
 * Location-scoped menu stock. The same menu can have different stock at
 * different locations, mirroring the DisableLocationMenus pattern used
 * for menu visibility.
 */
export class MenuStockService {
  /** Creates the first location-specific stock row inside the menu transaction. */
  static async createInitialStock(
    tx: Prisma.TransactionClient,
    menuId: number,
    locationId: number,
    quantity: number,
    isAvailable: boolean,
  ) {
    if (quantity < 0) {
      throw new ValidationError("Stock quantity cannot be negative.");
    }

    return tx.menuStock.create({
      data: {
        menuId,
        locationId,
        quantity,
        isManuallyDisabled: !isAvailable,
      },
    });
  }

  /** Optional lookup — a menu/location pair may not have a stock row yet
   *  (e.g. never restocked), so absence is a normal state, not an error. */
  static async getStock(menuId: number, locationId: number) {
    return prisma.menuStock.findFirst({ where: { menuId, locationId } });
  }

  /** All stock rows for a location, for the backoffice stock list page. */
  static async getStockForLocation(locationId: number) {
    return prisma.menuStock.findMany({
      where: { locationId, isArchived: false },
      include: { menu: true },
      orderBy: { id: "asc" },
    });
  }

  /**
   * Staff-entered restock / manual correction. Upserts because the first
   * time a location gets a quantity set, no row exists yet — creating one
   * on the fly is simpler than forcing a separate "initialize stock" step.
   */
  static async setStockQuantity(
    menuId: number,
    locationId: number,
    quantity: number,
  ) {
    if (quantity < 0) {
      throw new ValidationError("Stock quantity cannot be negative.");
    }

    return prisma.menuStock.upsert({
      where: { menuId_locationId: { menuId, locationId } },
      update: { quantity },
      create: { menuId, locationId, quantity },
    });
  }

  /**
   * Staff "Available / Unavailable" toggle from the menu card. Independent
   * of quantity — a menu can have stock left but still be manually paused
   * (e.g. the espresso machine is down).
   */
  static async toggleManualDisable(menuId: number, locationId: number) {
    const existing = await MenuStockService.getStock(menuId, locationId);

    return prisma.menuStock.upsert({
      where: { menuId_locationId: { menuId, locationId } },
      update: { isManuallyDisabled: !existing?.isManuallyDisabled },
      create: { menuId, locationId, isManuallyDisabled: true },
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

  /** Restock — plain increment, no race condition risk (no lower bound to race against). */
  static async incrementStock(
    menuId: number,
    locationId: number,
    amount: number,
  ) {
    return prisma.menuStock.upsert({
      where: { menuId_locationId: { menuId, locationId } },
      update: { quantity: { increment: amount } },
      create: { menuId, locationId, quantity: amount },
    });
  }
}
