"use client";

import { useSyncExternalStore } from "react";

/**
 * Remembers, per table and per browser, that the customer has moved on
 * from a round's outcome screen — "Order confirmed" (by tapping "Order
 * more" or adding to the next order) or "wasn't accepted" (by tapping
 * through it). The cart page then stops showing that screen for the
 * round (and every earlier one) and falls back to the normal / empty
 * cart. A newer round has a higher id, so its own screen still shows.
 *
 * Kept in localStorage so it survives navigating between pages; a
 * module-level copy backs it up when storage is unavailable (private
 * mode), which still covers the current tab session. Each kind of screen
 * has its own key, so dismissing one never hides the other.
 */

const CHANGE_EVENT = "round-dismissed-change";
const inMemory = new Map<string, number>();

/** Highest round id dismissed under this key (0 = none). */
function getDismissedUpTo(key: string) {
  let stored = 0;
  try {
    stored = Number(window.localStorage.getItem(key)) || 0;
  } catch {
    // storage blocked — fall through to the in-memory copy
  }
  return Math.max(stored, inMemory.get(key) ?? 0);
}

function dismissRound(key: string, roundId: number) {
  if (roundId <= getDismissedUpTo(key)) return;
  inMemory.set(key, roundId);
  try {
    window.localStorage.setItem(key, String(roundId));
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

/** True once the customer has moved on from this round's screen. `null`
 *  while it can't be known yet (the server render has no storage, and
 *  the first client render must match it) — callers should hold off
 *  deciding until it's a boolean. */
function useRoundDismissed(
  key: string,
  roundId: number | undefined,
): boolean | null {
  const dismissedUpTo = useSyncExternalStore<number | null>(
    subscribe,
    () => getDismissedUpTo(key),
    () => null,
  );
  if (dismissedUpTo === null) return null;
  return roundId !== undefined && roundId <= dismissedUpTo;
}

// Storage keys — the confirmed one is unchanged from before, so what
// browsers have already stored keeps working.
const confirmedKey = (tableId: number) => `order-confirmed-dismissed:${tableId}`;
const rejectedKey = (tableId: number) => `order-rejected-dismissed:${tableId}`;

export function dismissConfirmedRound(tableId: number, roundId: number) {
  dismissRound(confirmedKey(tableId), roundId);
}

export function useConfirmedRoundDismissed(
  tableId: number,
  roundId: number | undefined,
) {
  return useRoundDismissed(confirmedKey(tableId), roundId);
}

export function dismissRejectedRound(tableId: number, roundId: number) {
  dismissRound(rejectedKey(tableId), roundId);
}

export function useRejectedRoundDismissed(
  tableId: number,
  roundId: number | undefined,
) {
  return useRoundDismissed(rejectedKey(tableId), roundId);
}
