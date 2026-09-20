"use client";

import { useSyncExternalStore } from "react";

/**
 * Remembers, per table and per browser, that the customer has moved on
 * from a round's "Order confirmed" screen — by tapping "Order more" or by
 * adding something to the next order. The cart page then stops showing
 * that screen for the round (and everything before it) and falls back to
 * the normal / empty cart. A newer round has a higher id, so its own
 * confirmation still shows when it's approved.
 *
 * Kept in localStorage so it survives navigating between pages; a
 * module-level copy backs it up when storage is unavailable (private
 * mode), which still covers the current tab session.
 */

const CHANGE_EVENT = "order-confirmed-dismissed-change";
const inMemory = new Map<number, number>();

const storageKey = (tableId: number) => `order-confirmed-dismissed:${tableId}`;

/** Highest round id the customer has dismissed for this table (0 = none). */
export function getDismissedUpTo(tableId: number) {
  let stored = 0;
  try {
    stored = Number(window.localStorage.getItem(storageKey(tableId))) || 0;
  } catch {
    // storage blocked — fall through to the in-memory copy
  }
  return Math.max(stored, inMemory.get(tableId) ?? 0);
}

export function dismissConfirmedRound(tableId: number, roundId: number) {
  if (roundId <= getDismissedUpTo(tableId)) return;
  inMemory.set(tableId, roundId);
  try {
    window.localStorage.setItem(storageKey(tableId), String(roundId));
  } catch {
    // storage blocked — the in-memory copy still covers this session
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** True once the customer has moved on from this round's confirmation.
 *  `null` while it can't be known yet (the server render has no storage,
 *  and the first client render must match it) — callers should hold off
 *  deciding until it's a boolean. */
export function useConfirmedRoundDismissed(
  tableId: number,
  roundId: number | undefined,
): boolean | null {
  const dismissedUpTo = useSyncExternalStore<number | null>(
    subscribe,
    () => getDismissedUpTo(tableId),
    () => null,
  );
  if (dismissedUpTo === null) return null;
  return roundId !== undefined && roundId <= dismissedUpTo;
}
