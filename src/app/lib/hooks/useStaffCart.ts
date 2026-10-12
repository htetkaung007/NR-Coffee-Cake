"use client";

import {
  addLine,
  applyValidation,
  removeLine,
  setQuantity,
  updateLine,
  type BrowserCart,
  type BrowserCartLine,
} from "@/app/lib/cart/browserCart";
import type { CartValidationResult } from "@/app/lib/cart/cartValidation";
import {
  abandonSend,
  beginSend,
  changeLines,
  chooseTarget,
  emptyStaffCart,
  finishSend,
  isStaffCartKeyOf,
  parseStaffCart,
  staffCartKey,
  type StaffCart,
} from "@/app/lib/cart/staffCart";
import { todayInShop } from "@/app/lib/shopDay";
import type { OrderTarget } from "@/app/lib/order/orderTarget";
import { newRequestId } from "@/app/lib/hooks/useBrowserCart";
import {
  readStorage,
  useStoredValue,
  writeStorage,
} from "@/app/lib/hooks/useStoredValue";

/**
 * The staff New Order cart, kept in this browser until "Send to kitchen"
 * — a thin shell around lib/cart/staffCart.ts on top of the shared
 * localStorage store (useStoredValue): per location and signed-in user
 * (staffCartKey), dropped when it's from an earlier shop day.
 *
 * Storage may be blocked (private mode) or full: every write also goes to
 * an in-memory copy, which this tab reads from once a write didn't stick,
 * so the order keeps working for this tab. The server render and
 * hydration see an empty cart for `defaultTarget`; `isLoaded` turns true
 * once the stored one has been read.
 */

/** This tab's copy of each key's value — the fallback when storage
 *  refuses a write (or can't be read). */
const memory = new Map<string, string>();
/** Keys whose last write didn't reach storage: read from memory. */
const memoryOnly = new Set<string>();

function readRaw(key: string): string | null {
  if (memoryOnly.has(key)) return memory.get(key) ?? null;
  return readStorage(key) ?? memory.get(key) ?? null;
}

function writeRaw(key: string, value: string) {
  memory.set(key, value);
  writeStorage(key, value);
  if (readStorage(key) === value) memoryOnly.delete(key);
  else memoryOnly.add(key);
}

const nowIso = () => new Date().toISOString();

/** Sign-out: forgets every staff cart of `userId` (null: every staff
 *  cart) in this browser — a shared till must not hand the next person
 *  someone else's unsent order. Never throws. */
export function clearStaffCarts(userId: number | null) {
  for (const key of [...memory.keys()]) {
    if (isStaffCartKeyOf(key, userId)) {
      memory.delete(key);
      memoryOnly.delete(key);
    }
  }
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key !== null && isStaffCartKeyOf(key, userId)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage blocked — nothing was stored there to clear.
  }
}

export function useStaffCart(
  locationId: number,
  userId: number,
  /** Who a fresh cart is for (a new takeaway, when there's a counter). */
  defaultTarget: OrderTarget | null,
) {
  const scope = { locationId, userId };
  const key = staffCartKey(scope);
  const raw = useStoredValue(() => readRaw(key), null);
  const isLoaded = useStoredValue(() => true, false);

  const toCart = (text: string | null): StaffCart =>
    parseStaffCart(text, scope, todayInShop()) ??
    emptyStaffCart(scope, defaultTarget);
  const cart = toCart(raw);

  /** Applies `change` to the LATEST stored cart (not this render's —
   *  two quick taps both count) and writes it back if it changed. */
  function update(change: (cart: StaffCart) => StaffCart) {
    const before = toCart(readRaw(key));
    const after = change(before);
    if (after !== before) writeRaw(key, JSON.stringify(after));
    return after;
  }

  const lines = (change: (lines: BrowserCart) => BrowserCart) =>
    update((current) => changeLines(current, change, nowIso()));

  return {
    cart,
    isLoaded,
    addLine: (line: BrowserCartLine) =>
      lines((c) => addLine(c, line, nowIso(), newRequestId)),
    setQuantity: (index: number, quantity: number) =>
      lines((c) => setQuantity(c, index, quantity, nowIso())),
    removeLine: (index: number) => lines((c) => removeLine(c, index, nowIso())),
    updateLine: (index: number, line: BrowserCartLine) =>
      lines((c) => updateLine(c, index, line, nowIso())),
    /** Refreshes the shown names and prices from a check. */
    applyValidation: (result: CartValidationResult) =>
      lines((c) => applyValidation(c, result)),
    chooseTarget: (target: OrderTarget | null) =>
      update((current) => chooseTarget(current, target, nowIso())),
    /** The request id this send uses (kept until it succeeds). */
    beginSend: () =>
      update((current) => beginSend(current, newRequestId)).pendingRequestId,
    finishSend: () =>
      update((current) => finishSend(current, nowIso(), defaultTarget)),
    /** Nothing was written under the pending request id: unlock the
     *  order (its next send gets a fresh id). */
    abandonSend: () => update((current) => abandonSend(current, nowIso())),
  };
}
