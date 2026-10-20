"use client";

import { useSyncExternalStore } from "react";

/**
 * THE one way client code touches localStorage — every read, write,
 * removal and key listing goes through these helpers. Storage may be
 * blocked (private mode, policy) or full, so none of them ever throws —
 * each caller keeps its own in-memory copy for that case. Two kinds:
 * - readStorage / setStorageItem / removeStorageItem / storageKeys: plain,
 *   silent access, for stores that notify their own readers (the browser
 *   cart, the staff menu language, the theme mode);
 * - writeStorage + useStoredValue: a write that also tells every
 *   useStoredValue in this tab to re-read (useSeenFlag,
 *   useRoundDismissed, useOrderAlertSound, the staff cart). The
 *   browser's `storage` event covers other tabs.
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

/** Stores `value`; silently skipped when storage is blocked or full. */
export function setStorageItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage blocked — the caller's in-memory copy covers this session
  }
}

/** Removes `key`; silently skipped when storage is blocked. */
export function removeStorageItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // storage blocked — nothing was stored there
  }
}

/** Every key in this site's storage ([] when storage is blocked). */
export function storageKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key !== null) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

/** Stores `value` (silently skipped when storage is blocked) and tells
 *  every useStoredValue in this tab to re-read. */
export function writeStorage(key: string, value: string) {
  setStorageItem(key, value);
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
