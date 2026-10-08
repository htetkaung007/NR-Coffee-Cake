import { describe, it, expect, vi, beforeEach } from "vitest";

// A tiny in-memory database standing in for the Prisma client (as in
// menuStock.service.test.ts): one company (1), one location (10) with a
// table (3), one visible category (5) and two menus in it — Iced Latte
// (shown) and Mocha, hidden at location 10 by an active
// DisableLocationMenus row. Only the reads these paths make are faked;
// any write goes through $transaction, which records that it ran.
type Where = { id?: number | { in: number[] }; menuId?: number | { in: number[] } };
const ids = (filter: Where["id"]) =>
  filter === undefined ? null : typeof filter === "number" ? [filter] : filter.in;

const db = {
  menus: [
    { id: 1, name: "Iced Latte", price: 3000, isArchived: false },
    { id: 2, name: "Mocha", price: 3500, isArchived: false },
  ],
  hideRows: [{ menuId: 2, locationId: 10, isArchived: false }],
  stocks: [{ menuId: 1, quantity: 0, isManuallyDisabled: true }],
  orders: [] as { menuId: number }[],
};
const transaction = vi.fn(async () => "written");

vi.mock("@/app/utils/prisma", () => ({
  prisma: {
    location: {
      findFirst: async ({ where }: { where: { id: number } }) =>
        where.id === 10 ? { companyId: 1 } : null,
    },
    table: {
      findFirst: async ({ where }: { where: { id: number } }) =>
        where.id === 3 ? { locationId: 10 } : null,
    },
    orderSession: {
      findFirst: async () => ({ id: 7, status: "CART", locationId: 10 }),
    },
    order: {
      findMany: async () =>
        db.orders.map((order, index) => ({
          ...order,
          id: index + 1,
          quantity: 1,
          unitPrice: 3000,
          note: null,
          contributorToken: "token",
          OrdersAddons: [],
          menu: db.menus.find((menu) => menu.id === order.menuId),
        })),
    },
    menu: {
      findMany: async ({ where }: { where: Where }) => {
        const wanted = ids(where.id);
        return db.menus.filter((menu) => !wanted || wanted.includes(menu.id));
      },
    },
    menuStock: { findMany: async () => db.stocks },
    disableLocationMenus: {
      findMany: async () =>
        db.hideRows
          .filter((row) => row.locationId === 10 && !row.isArchived)
          .map((row) => ({ menuId: row.menuId })),
    },
    menuCategory: { findMany: async () => [{ id: 5 }] },
    menuMenuCategory: {
      findMany: async () =>
        db.menus.map((menu) => ({ menuId: menu.id, menuCategoryId: 5 })),
    },
    addon: { findMany: async () => [] },
    menuAddonCategories: { findMany: async () => [] },
    $transaction: () => transaction(),
  },
}));

import { CartValidationService } from "./cartValidation.service";
import { TableDraftService } from "./tableDraft.service";
import { OrderSessionCartService } from "./orderService/orderSessionCart.service";
import { StaffOrderService } from "./orderService/staffOrder.service";

const HIDDEN_MESSAGE = '"Mocha" isn\'t available at this location.';

beforeEach(() => {
  transaction.mockClear();
  db.orders = [];
});

describe("CartValidationService.assertMenusListed", () => {
  it("refuses a menu hidden at the location, by name", async () => {
    await expect(
      CartValidationService.assertMenusListed(10, [1, 2]),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", message: HIDDEN_MESSAGE });
  });

  it("lets a listed menu through even when it is switched off and at 0 stock", async () => {
    await expect(CartValidationService.assertMenusListed(10, [1])).resolves.toBeUndefined();
  });

  it("refuses a menu the location's company doesn't sell as not found", async () => {
    await expect(
      CartValidationService.assertMenusListed(10, [99]),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("adding a menu hidden at the location is refused on the server", () => {
  it("Table QR: addDraftItem refuses it before writing anything", async () => {
    await expect(
      TableDraftService.addDraftItem(3, "token", 2, 1),
    ).rejects.toMatchObject({ message: HIDDEN_MESSAGE });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("Table QR: addDraftItem still adds a listed menu", async () => {
    await expect(TableDraftService.addDraftItem(3, "token", 1, 1)).resolves.toBe(
      "written",
    );
  });

  it("staff POS: addItemToCart refuses it before writing anything", async () => {
    await expect(
      OrderSessionCartService.addItemToCart(7, 3, 2, 1),
    ).rejects.toMatchObject({ message: HIDDEN_MESSAGE });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("sending a menu hidden at the location is refused on the server", () => {
  it("Table QR: Send to Kitchen refuses a draft picked before the menu was hidden", async () => {
    db.orders = [{ menuId: 1 }, { menuId: 2 }];
    await expect(TableDraftService.submitDraft(3, 10, false)).rejects.toMatchObject({
      message: HIDDEN_MESSAGE,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("staff POS: submit refuses a line added before the menu was hidden", async () => {
    db.orders = [{ menuId: 2 }];
    await expect(StaffOrderService.submitStaffOrder(7)).rejects.toMatchObject({
      message: HIDDEN_MESSAGE,
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});
