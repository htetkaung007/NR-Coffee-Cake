"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  addLine,
  applyValidation,
  clear,
  emptyCart,
  itemCount,
  parseCart,
  removeLine,
  setQuantity,
  updateLine,
  type BrowserCart,
  type BrowserCartLine,
} from "@/app/lib/browserCart";
import type { CartValidationResult } from "@/app/lib/cartValidation";

/**
 * The Counter customer's cart, kept in this browser (localStorage) — a
 * thin shell around the pure functions in lib/browserCart.ts.
 *
 * One copy per location and tab lives in `current`: it's the snapshot
 * useSyncExternalStore hands out (the same object until something
 * changes) and the fallback when storage is blocked (Safari private
 * mode, quota) — every storage read/write is wrapped, and on failure
 * the cart simply keeps working in memory for this tab. Other tabs'
 * writes arrive through the `storage` event; this tab's own writes
 * announce themselves with CHANGE_EVENT so every component using the
 * hook re-renders. The server snapshot is always an empty cart, so the
 * server render and hydration never touch localStorage.
 */

const CHANGE_EVENT = "browser-cart-change";

const storageKey = (locationId: number) => `cart:v1:${locationId}`;

const current = new Map<number, BrowserCart>();
const serverSnapshots = new Map<number, BrowserCart>();

function readStored(locationId: number): BrowserCart {
  try {
    return parseCart(
      window.localStorage.getItem(storageKey(locationId)),
      locationId,
    );
  } catch {
    return emptyCart(locationId);
  }
}

function getCart(locationId: number): BrowserCart {
  let cart = current.get(locationId);
  if (!cart) {
    cart = readStored(locationId);
    current.set(locationId, cart);
  }
  return cart;
}

function getServerCart(locationId: number): BrowserCart {
  let cart = serverSnapshots.get(locationId);
  if (!cart) {
    cart = emptyCart(locationId);
    serverSnapshots.set(locationId, cart);
  }
  return cart;
}

function writeCart(locationId: number, cart: BrowserCart) {
  current.set(locationId, cart);
  try {
    window.localStorage.setItem(storageKey(locationId), JSON.stringify(cart));
  } catch {
    // Storage blocked or full — the in-memory copy keeps this tab going.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(locationId: number, onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    // key === null: another tab cleared all of this site's storage.
    if (event.key !== null && event.key !== storageKey(locationId)) return;
    current.set(locationId, parseCart(event.newValue, locationId));
    onChange();
  }
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** crypto.randomUUID exists only in secure contexts (HTTPS/localhost);
 *  a phone on the shop's LAN over plain http gets a v4 UUID built from
 *  getRandomValues instead, which is available everywhere. */
function newRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

const nowIso = () => new Date().toISOString();

function subscribeNothing() {
  return () => {};
}

export function useBrowserCart(locationId: number) {
  const subscribeToCart = useCallback(
    (onChange: () => void) => subscribe(locationId, onChange),
    [locationId],
  );
  const cart = useSyncExternalStore(
    subscribeToCart,
    () => getCart(locationId),
    () => getServerCart(locationId),
  );
  // False during the server render and hydration (the empty server
  // snapshot is showing), true once the stored cart has been read — so
  // a page can wait instead of flashing "your cart is empty".
  const isLoaded = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  const update = useCallback(
    (change: (cart: BrowserCart) => BrowserCart) => {
      const before = getCart(locationId);
      const after = change(before);
      if (JSON.stringify(after) === JSON.stringify(before)) return;
      writeCart(locationId, after);
    },
    [locationId],
  );

  return useMemo(
    () => ({
      cart,
      isLoaded,
      itemCount: itemCount(cart),
      addLine: (line: BrowserCartLine) =>
        update((c) => addLine(c, line, nowIso(), newRequestId)),
      setQuantity: (index: number, quantity: number) =>
        update((c) => setQuantity(c, index, quantity, nowIso())),
      removeLine: (index: number) =>
        update((c) => removeLine(c, index, nowIso())),
      /** Several lines at once (highest position first, so the others
       *  keep theirs) — one write. */
      removeLines: (indexes: readonly number[]) =>
        update((c) =>
          [...indexes]
            .sort((a, b) => b - a)
            .reduce((next, index) => removeLine(next, index, nowIso()), c),
        ),
      updateLine: (index: number, line: BrowserCartLine) =>
        update((c) => updateLine(c, index, line, nowIso())),
      clear: () => update((c) => clear(c, nowIso())),
      applyValidation: (result: CartValidationResult) =>
        update((c) => applyValidation(c, result)),
    }),
    [cart, isLoaded, update],
  );
}
