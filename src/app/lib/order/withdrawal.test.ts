import { describe, it, expect } from "vitest";
import {
  toCounterHandBack,
  toTableDraftRows,
  withdrawBlock,
  WITHDRAW_BLOCK_MESSAGES,
  type RoundLineSource,
} from "./withdrawal";

const NOW = new Date("2026-10-10T03:30:00.000Z");
const LATER = new Date("2026-10-10T03:35:00.000Z");
const EARLIER = new Date("2026-10-10T03:25:00.000Z");

const counterRound = (status: string, approvalExpiresAt: Date | null = LATER) => ({
  status,
  isCounter: true,
  approvalExpiresAt,
});
const tableRound = (status: string) => ({
  status,
  isCounter: false,
  approvalExpiresAt: null,
});

describe("withdrawBlock — which rounds a customer may withdraw", () => {
  it("allows a Counter round while its countdown runs", () => {
    expect(withdrawBlock(counterRound("PENDING_APPROVAL"), NOW)).toBeNull();
  });

  it("allows a Counter round with no deadline still waiting", () => {
    expect(withdrawBlock(counterRound("PENDING_APPROVAL", null), NOW)).toBeNull();
  });

  it("refuses a Counter round past its deadline — it's about to expire", () => {
    expect(withdrawBlock(counterRound("PENDING_APPROVAL", EARLIER), NOW)).toBe(
      "expired",
    );
  });

  it("refuses exactly at the deadline", () => {
    expect(withdrawBlock(counterRound("PENDING_APPROVAL", NOW), NOW)).toBe("expired");
  });

  it("allows a waiting Table round, even past its soft target", () => {
    expect(withdrawBlock(tableRound("PENDING_APPROVAL"), NOW)).toBeNull();
  });

  it("refuses once the counter accepted it — pending, cooking, completed or paid", () => {
    for (const status of ["PENDING", "COOKING", "COMPLETED", "PAID"]) {
      expect(withdrawBlock(tableRound(status), NOW)).toBe("accepted");
    }
  });

  it("refuses a round that's already cancelled (rejected, expired or withdrawn)", () => {
    expect(withdrawBlock(counterRound("CANCELLED"), NOW)).toBe("cancelled");
  });

  it("refuses a cart that was never sent", () => {
    expect(withdrawBlock(counterRound("CART"), NOW)).toBe("notSent");
  });

  it("tells an accepted round's customer to ask the staff", () => {
    expect(WITHDRAW_BLOCK_MESSAGES.accepted).toBe(
      "The counter already accepted this order. Please ask the staff to change it.",
    );
  });
});

const line = (overrides: Partial<RoundLineSource> = {}): RoundLineSource => ({
  menuId: 1,
  quantity: 2,
  unitPrice: 2000,
  note: "less ice",
  contributorToken: "tok-a",
  menu: { name: "Latte", assetUrl: "https://img/latte.png" },
  OrdersAddons: [{ addonId: 9, unitPrice: 500, addon: { name: "Extra shot" } }],
  ...overrides,
});

describe("toCounterHandBack — Counter 'Change order'", () => {
  it("gives each line back as a browser-cart line, with what it showed", () => {
    expect(toCounterHandBack([line()])).toEqual([
      {
        menuId: 1,
        addonIds: [9],
        quantity: 2,
        note: "less ice",
        display: {
          name: "Latte",
          unitPrice: 2000,
          addons: [{ id: 9, name: "Extra shot", unitPrice: 500 }],
          imageUrl: "https://img/latte.png",
        },
      },
    ]);
  });

  it("never hands back whose pick it was", () => {
    expect(JSON.stringify(toCounterHandBack([line()]))).not.toContain("tok-a");
  });
});

describe("toTableDraftRows — Table 'Change order'", () => {
  it("recreates each line as a draft at the table, keeping its customer and prices", () => {
    expect(toTableDraftRows([line(), line({ contributorToken: "tok-b", quantity: 1 })], 3)).toEqual([
      {
        tableId: 3,
        menuId: 1,
        quantity: 2,
        unitPrice: 2000,
        note: "less ice",
        contributorToken: "tok-a",
        addons: [{ addonId: 9, unitPrice: 500 }],
      },
      {
        tableId: 3,
        menuId: 1,
        quantity: 1,
        unitPrice: 2000,
        note: "less ice",
        contributorToken: "tok-b",
        addons: [{ addonId: 9, unitPrice: 500 }],
      },
    ]);
  });
});
