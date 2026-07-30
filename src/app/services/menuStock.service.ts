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
   */
  static async decrementStock(
    menuId: number,
    locationId: number,
    amount: number,
  ) {
    const result = await prisma.menuStock.updateMany({
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
      throw new InsufficientStockError(menuId, locationId);
    }
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
