import { describe, it, expect } from "vitest";
import { addLine, setQuantity, type BrowserCartLine } from "./browserCart";
import {
  abandonSend,
  asBrowserCart,
  beginSend,
  changeLines,
  chooseTarget,
  emptyStaffCart,
  finishSend,
  isFromEarlierShopDay,
  isSendUnconfirmed,
  isStaffCartKeyOf,
  parseStaffCart,
  staffCartKey,
  type StaffCart,
} from "./staffCart";

// ── Fixtures ────────────────────────────────────────────────────────────

const SCOPE = { locationId: 7, userId: 3 };
const COUNTER_NEW = { kind: "counterNew" } as const;
const TABLE_3 = { kind: "table", tableId: 41 } as const;
const BILL_12 = { kind: "counterBill", billRootId: 12 } as const;
const LATTE = 1;
// 2026-10-10 10:00 in Yangon (UTC+6:30) is 03:30 UTC.
const TODAY = "2026-10-10";
const T1 = "2026-10-10T03:30:00.000Z";
const T2 = "2026-10-10T03:35:00.000Z";
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

const latte: BrowserCartLine = {
  menuId: LATTE,
  addonIds: [],
  quantity: 1,
  note: null,
  display: { name: "Latte", unitPrice: 2000, addons: [], imageUrl: null },
};

const never = () => {
  throw new Error("newId should not be called");
};

function cartWithLatte(): StaffCart {
  return changeLines(
    emptyStaffCart(SCOPE, TABLE_3),
    (lines) => addLine(lines, latte, T1, () => ID_B),
    T1,
  );
}

// ── Rules ───────────────────────────────────────────────────────────────

describe("staffCartKey", () => {
  it("is per location and per signed-in user", () => {
    expect(staffCartKey(SCOPE)).toBe("staffCart:v1:7:3");
  });
});

describe("isStaffCartKeyOf", () => {
  it("matches this user's staff carts at any location", () => {
    expect(isStaffCartKeyOf("staffCart:v1:7:3", 3)).toBe(true);
    expect(isStaffCartKeyOf("staffCart:v1:9:3", 3)).toBe(true);
  });

  it("leaves another user's cart alone", () => {
    expect(isStaffCartKeyOf("staffCart:v1:7:13", 3)).toBe(false);
  });

  it("never matches the customer's cart or anything else", () => {
    expect(isStaffCartKeyOf("cart:v1:7", 3)).toBe(false);
    expect(isStaffCartKeyOf("theme", null)).toBe(false);
  });

  it("matches every staff cart when the user isn't known", () => {
    expect(isStaffCartKeyOf("staffCart:v1:7:13", null)).toBe(true);
  });
});

describe("isFromEarlierShopDay", () => {
  it("is false for a cart touched today in Yangon", () => {
    expect(isFromEarlierShopDay(T1, TODAY)).toBe(false);
  });

  it("is true for yesterday's cart", () => {
    expect(isFromEarlierShopDay("2026-10-09T10:00:00.000Z", TODAY)).toBe(true);
  });

  it("goes by the shop's day, not UTC's: 23:00 UTC on the 9th is already the 10th in Yangon", () => {
    expect(isFromEarlierShopDay("2026-10-09T23:00:00.000Z", TODAY)).toBe(false);
  });
});

describe("parseStaffCart", () => {
  const stored = () => JSON.stringify(cartWithLatte());

  it("reads back a cart stored today", () => {
    expect(parseStaffCart(stored(), SCOPE, TODAY)).toEqual(cartWithLatte());
  });

  it("gives null for nothing stored, broken JSON or the wrong shape", () => {
    expect(parseStaffCart(null, SCOPE, TODAY)).toBeNull();
    expect(parseStaffCart("{not json", SCOPE, TODAY)).toBeNull();
    expect(parseStaffCart(JSON.stringify({ version: 2 }), SCOPE, TODAY)).toBeNull();
  });

  it("discards a cart from an earlier shop day", () => {
    expect(parseStaffCart(stored(), SCOPE, "2026-10-11")).toBeNull();
  });

  it("discards another location's or another user's cart", () => {
    expect(parseStaffCart(stored(), { ...SCOPE, locationId: 8 }, TODAY)).toBeNull();
    expect(parseStaffCart(stored(), { ...SCOPE, userId: 4 }, TODAY)).toBeNull();
  });
});

describe("changeLines", () => {
  it("applies browserCart's line rules — an identical add merges", () => {
    const cart = changeLines(
      cartWithLatte(),
      // browserCart's own request id is unused here (pendingRequestId).
      (lines) => addLine(lines, latte, T2, () => ID_B),
      T2,
    );
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(2);
    expect(cart.updatedAt).toBe(T2);
  });

  it("removes a line whose quantity goes to 0", () => {
    const cart = changeLines(
      cartWithLatte(),
      (lines) => setQuantity(lines, 0, 0, T2),
      T2,
    );
    expect(cart.lines).toEqual([]);
  });

  it("refuses every change while a send is unconfirmed — edited lines never go out under the old request id", () => {
    const sending = beginSend(cartWithLatte(), () => ID_A);
    const cart = changeLines(
      sending,
      (lines) => setQuantity(lines, 0, 3, T2),
      T2,
    );
    expect(cart).toBe(sending);
    expect(cart.lines[0].quantity).toBe(1);
  });

  it("refuses an add while a send is unconfirmed", () => {
    const sending = beginSend(cartWithLatte(), () => ID_A);
    const cart = changeLines(
      sending,
      (lines) => addLine(lines, latte, T2, () => ID_B),
      T2,
    );
    expect(cart).toBe(sending);
  });

  it("leaves the cart untouched when the lines don't change", () => {
    const cart = cartWithLatte();
    expect(changeLines(cart, (lines) => lines, T2)).toBe(cart);
  });

  it("counts equal lines as unchanged even as a new array (a price check that found nothing new)", () => {
    const cart = cartWithLatte();
    const copy = (lines: ReturnType<typeof asBrowserCart>) => ({
      ...lines,
      lines: lines.lines.map((line) => ({ ...line })),
    });
    expect(changeLines(cart, copy, T2)).toBe(cart);
  });
});

describe("chooseTarget", () => {
  it("switching who it's for starts a new order: the lines go", () => {
    const cart = chooseTarget(cartWithLatte(), COUNTER_NEW, T2);
    expect(cart.target).toEqual(COUNTER_NEW);
    expect(cart.lines).toEqual([]);
    expect(cart.pendingRequestId).toBeNull();
  });

  it("refuses a switch while a send is unconfirmed — that order may already be in the kitchen", () => {
    const sending = beginSend(cartWithLatte(), () => ID_A);
    expect(chooseTarget(sending, COUNTER_NEW, T2)).toBe(sending);
  });

  it("choosing nobody (the other mode) clears the target and the lines", () => {
    const cart = chooseTarget(cartWithLatte(), null, T2);
    expect(cart.target).toBeNull();
    expect(cart.lines).toEqual([]);
  });

  it("picking the same target changes nothing", () => {
    const cart = cartWithLatte();
    expect(chooseTarget(cart, { kind: "table", tableId: 41 }, T2)).toBe(cart);
  });
});

describe("beginSend", () => {
  it("gives the first send a new request id", () => {
    expect(beginSend(cartWithLatte(), () => ID_A).pendingRequestId).toBe(ID_A);
  });

  it("reuses the id of a send that never got an answer, so a retry can't make two orders", () => {
    const first = beginSend(cartWithLatte(), () => ID_A);
    expect(beginSend(first, never).pendingRequestId).toBe(ID_A);
  });
});

describe("finishSend", () => {
  it("empties the cart for the same table and forgets the request id", () => {
    const sent = finishSend(beginSend(cartWithLatte(), () => ID_A), T2, COUNTER_NEW);
    expect(sent.lines).toEqual([]);
    expect(sent.target).toEqual(TABLE_3);
    expect(sent.pendingRequestId).toBeNull();
  });

  it("after a round onto an existing Counter bill, the next order is a new takeaway", () => {
    const onBill = chooseTarget(cartWithLatte(), BILL_12, T1);
    expect(finishSend(onBill, T2, COUNTER_NEW).target).toEqual(COUNTER_NEW);
  });
});

describe("isSendUnconfirmed", () => {
  it("is false for an order nobody has tried to send", () => {
    expect(isSendUnconfirmed(cartWithLatte())).toBe(false);
  });

  it("is true from Send until the send is settled", () => {
    expect(isSendUnconfirmed(beginSend(cartWithLatte(), () => ID_A))).toBe(true);
  });
});

describe("abandonSend", () => {
  it("unlocks the order and keeps its lines and target when nothing was written", () => {
    const sending = beginSend(cartWithLatte(), () => ID_A);
    const cart = abandonSend(sending, T2);
    expect(isSendUnconfirmed(cart)).toBe(false);
    expect(cart.lines).toEqual(sending.lines);
    expect(cart.target).toEqual(TABLE_3);
  });

  it("lets the lines be edited again afterwards", () => {
    const unlocked = abandonSend(beginSend(cartWithLatte(), () => ID_A), T2);
    const cart = changeLines(unlocked, (lines) => setQuantity(lines, 0, 3, T2), T2);
    expect(cart.lines[0].quantity).toBe(3);
  });

  it("gives the next send a fresh request id", () => {
    const unlocked = abandonSend(beginSend(cartWithLatte(), () => ID_A), T2);
    expect(beginSend(unlocked, () => ID_B).pendingRequestId).toBe(ID_B);
  });

  it("changes nothing when no send is pending", () => {
    const cart = cartWithLatte();
    expect(abandonSend(cart, T2)).toBe(cart);
  });
});

describe("a send whose answer never arrived", () => {
  it("found by the status check: the order is cleared and the next one starts fresh", () => {
    const sending = beginSend(cartWithLatte(), () => ID_A);
    const found = finishSend(sending, T2, COUNTER_NEW);
    expect(found.lines).toEqual([]);
    expect(isSendUnconfirmed(found)).toBe(false);
  });

  it("retried before it's settled: the same id and the same lines go again", () => {
    const sending = beginSend(cartWithLatte(), () => ID_A);
    const edited = changeLines(sending, (lines) => setQuantity(lines, 0, 3, T2), T2);
    const retry = beginSend(edited, never);
    expect(retry.pendingRequestId).toBe(ID_A);
    expect(retry.lines).toEqual(sending.lines);
  });
});
