"use client";

import { useSyncExternalStore } from "react";

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

const CHANGE_EVENT = "seen-flag-change";
const inMemory = new Set<string>();

function isSeen(key: string) {
  if (inMemory.has(key)) return true;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false; // storage blocked — only the in-memory copy counts
  }
}

export function markSeen(key: string) {
  if (isSeen(key)) return;
  inMemory.add(key);
  try {
    window.localStorage.setItem(key, "1");
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

/** True once `markSeen(key)` has run in this browser; always true for no key. */
export function useSeenFlag(key: string | undefined): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (key ? isSeen(key) : true),
    () => true,
  );
}
