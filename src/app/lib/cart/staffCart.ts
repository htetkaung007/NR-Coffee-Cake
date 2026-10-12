import { z } from "zod";
import { idSchema } from "../schemas/common";
import { toShopDay } from "../shopDay";
import {
  clear,
  emptyCart,
  storedLineSchema,
  type BrowserCart,
  type BrowserCartLine,
} from "./browserCart";
import {
  orderTargetSchema,
  targetKey,
  type OrderTarget,
} from "../order/orderTarget";

/**
 * The Backoffice New Order cart, kept in this browser (localStorage) until
 * "Send to kitchen" — one viewer on one device, so nothing is written to
 * the database while it's being built (for Counter and Table alike).
 * Pure: the lines are browserCart's own (same line shape, the same
 * add / quantity / edit / merge rules — applied through changeLines), and
 * the shown prices are display only: the server re-prices on send.
 *
 * Besides the lines it keeps who the order is for (target — a new
 * takeaway, a round on an open Counter bill, or a table:
 * lib/order/orderTarget) and, once
 * Send has been pressed, the request id that send used (pendingRequestId).
 *
 * While pendingRequestId is set the order is LOCKED (isSendUnconfirmed):
 * a send is out, or its answer never arrived, so it may already be in
 * the kitchen under that id. Lines and target can't change then
 * (changeLines and chooseTarget return the cart as it is) — edited lines
 * must never go out under the old id, where the server would answer
 * with the first order and drop the edits. It's settled one of three
 * ways: the send succeeds or the status check finds it (finishSend), or
 * the server answers that nothing was written — a refusal, or the status
 * check finding nothing (abandonSend).
 */
export interface StaffCart {
  /** 2: `target` replaced #74's `tableId` — an older cart is dropped. */
  version: 2;
  locationId: number;
  userId: number;
  /** Who it's for; null when nothing is chosen. */
  target: OrderTarget | null;
  lines: BrowserCartLine[];
  updatedAt: string;
  pendingRequestId: string | null;
}

/** Whose cart a stored one must be: this location, this signed-in user. */
interface StaffCartScope {
  locationId: number;
  userId: number;
}

/** Every staff cart key starts with this — how sign-out finds them. */
const STAFF_CART_KEY_PREFIX = "staffCart:v1:";

export function staffCartKey({ locationId, userId }: StaffCartScope) {
  return `${STAFF_CART_KEY_PREFIX}${locationId}:${userId}`;
}

/** Is `key` one of `userId`'s staff carts (any location)? With no user
 *  known, every staff cart counts. */
export function isStaffCartKeyOf(key: string, userId: number | null) {
  if (!key.startsWith(STAFF_CART_KEY_PREFIX)) return false;
  return userId === null || key.endsWith(`:${userId}`);
}

/** A fixed timestamp for a cart nobody has touched — keeps this pure. */
const NEVER_UPDATED = new Date(0).toISOString();

export function emptyStaffCart(
  scope: StaffCartScope,
  target: OrderTarget | null,
): StaffCart {
  return {
    version: 2,
    locationId: scope.locationId,
    userId: scope.userId,
    target,
    lines: [],
    updatedAt: NEVER_UPDATED,
    pendingRequestId: null,
  };
}

/** Last touched on an earlier shop day (Asia/Yangon) than `today` — an
 *  order left from yesterday is not today's order. */
export function isFromEarlierShopDay(updatedAt: string, today: string) {
  return toShopDay(new Date(updatedAt)) < today;
}

const storedStaffCartSchema = z.object({
  version: z.literal(2),
  locationId: idSchema,
  userId: idSchema,
  target: orderTargetSchema.nullable(),
  lines: z.array(storedLineSchema),
  updatedAt: z.iso.datetime(),
  pendingRequestId: z.uuid().nullable(),
});

/** Reads a stored staff cart (localStorage text). Null — the caller
 *  starts a fresh one — when there's nothing usable: nothing stored, not
 *  JSON, the wrong shape or version, another location's or user's cart,
 *  or one from an earlier shop day. Never throws. */
export function parseStaffCart(
  raw: string | null,
  scope: StaffCartScope,
  today: string,
): StaffCart | null {
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = storedStaffCartSchema.safeParse(json);
  if (!parsed.success) return null;
  const cart = parsed.data;
  if (cart.locationId !== scope.locationId || cart.userId !== scope.userId) {
    return null;
  }
  if (isFromEarlierShopDay(cart.updatedAt, today)) return null;
  return cart;
}

/** The lines as a BrowserCart — what browserCart's line functions and
 *  checks (toServerLines, useCartValidation) take. Its own request id is
 *  unused here (see pendingRequestId). */
export function asBrowserCart(cart: StaffCart): BrowserCart {
  return { ...emptyCart(cart.locationId), lines: cart.lines };
}

/** A send is out or unanswered (pendingRequestId set): the order is
 *  locked until it's settled (finishSend / abandonSend). */
export function isSendUnconfirmed(cart: StaffCart) {
  return cart.pendingRequestId !== null;
}

/** Applies one of browserCart's line changes (addLine, setQuantity,
 *  removeLine, updateLine, applyValidation) to the staff cart's lines. A
 *  change that leaves the lines as they were (a price refresh that found
 *  nothing new) returns the cart itself — nothing to store; so does any
 *  change while a send is unconfirmed (the lines are locked). */
export function changeLines(
  cart: StaffCart,
  change: (lines: BrowserCart) => BrowserCart,
  now: string,
): StaffCart {
  if (isSendUnconfirmed(cart)) return cart;
  const lines = change(asBrowserCart(cart)).lines;
  const unchanged = JSON.stringify(lines) === JSON.stringify(cart.lines);
  return unchanged ? cart : { ...cart, lines, updatedAt: now };
}

/** Picks who the order is for — or nobody (null: the other "Order for"
 *  mode was chosen and nothing in it is picked yet). A different target
 *  starts a new order: the lines go (the page asks first when there are
 *  any). Refused (the cart as it is) while a send is unconfirmed — the
 *  order may already be in the kitchen. */
export function chooseTarget(
  cart: StaffCart,
  target: OrderTarget | null,
  now: string,
): StaffCart {
  const keyOf = (of: OrderTarget | null) => (of ? targetKey(of) : null);
  if (keyOf(cart.target) === keyOf(target) || isSendUnconfirmed(cart)) {
    return cart;
  }
  return {
    ...cart,
    target,
    lines: clear(asBrowserCart(cart), now).lines,
    updatedAt: now,
  };
}

/** "Send to kitchen" pressed: the request id for this order — the one a
 *  previous, unanswered send already used (the lines are locked since,
 *  so it's the same order), or a new one. */
export function beginSend(cart: StaffCart, newId: () => string): StaffCart {
  return cart.pendingRequestId ? cart : { ...cart, pendingRequestId: newId() };
}

/** The order reached the kitchen: an empty cart, no pending request id
 *  (the next order gets a fresh one), and who the next order is for —
 *  the same table or new takeaway; after a round onto an existing
 *  Counter bill, `next` (a new takeaway), so a later order never joins
 *  that bill by accident. */
export function finishSend(
  cart: StaffCart,
  now: string,
  next: OrderTarget | null,
): StaffCart {
  const target = cart.target?.kind === "counterBill" ? next : cart.target;
  return { ...cart, target, lines: [], pendingRequestId: null, updatedAt: now };
}

/** The server answered that nothing was written — a refusal (a line
 *  that can't go, a closed bill …) or the status check finding no order
 *  under this id: the request id is dropped and the order unlocked. The
 *  next send, edited or not, gets a fresh id. */
export function abandonSend(cart: StaffCart, now: string): StaffCart {
  if (!isSendUnconfirmed(cart)) return cart;
  return { ...cart, pendingRequestId: null, updatedAt: now };
}
