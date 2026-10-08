"use client";

import { readStorage, useStoredValue, writeStorage } from "./useStoredValue";

/**
 * A per-browser "the user has already seen this" flag (e.g. a nav item's
 * "New" badge), kept in localStorage under the given key. A module-level
 * set backs it up when storage is blocked (private mode), which still
 * covers the current tab session.
 *
 * The server snapshot is "already seen", so SSR and hydration never show
 * whatever the flag hides — it can only appear after hydration, never
 * flash and vanish.
 */

const inMemory = new Set<string>();

function isSeen(key: string) {
  return inMemory.has(key) || readStorage(key) === "1";
}

export function markSeen(key: string) {
  if (isSeen(key)) return;
  inMemory.add(key);
  writeStorage(key, "1");
}

/** True once `markSeen(key)` has run in this browser; always true for no key. */
export function useSeenFlag(key: string | undefined): boolean {
  return useStoredValue(() => (key ? isSeen(key) : true), true);
}
