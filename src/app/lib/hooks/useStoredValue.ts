"use client";

import { useSyncExternalStore } from "react";

/**
 * The one way the client hooks keep small per-browser values in
 * localStorage (useSeenFlag, useRoundDismissed, useOrderAlertSound).
 * Storage may be blocked (private mode), so reads and writes never
 * throw — each caller keeps its own in-memory copy for that case and
 * merges it in its `read`. A write dispatches a same-tab change event;
 * the browser's `storage` event covers other tabs.
 */

const CHANGE_EVENT = "stored-value-change";

/** The stored string, or null when missing or storage is blocked. */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // storage blocked — the caller falls back to memory
  }
}

/** Stores `value` (silently skipped when storage is blocked) and tells
 *  every useStoredValue in this tab to re-read. */
export function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage blocked — the caller's in-memory copy covers this session
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

/** The current value from `read` (which returns a primitive, so React can
 *  compare snapshots), re-read after any write. `serverValue` is what the
 *  server render and hydration see — the stored value appears after. */
export function useStoredValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribe, read, () => serverValue);
}
