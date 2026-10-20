"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readStorage, setStorageItem } from "./useStoredValue";
import type { AppLocale } from "@/app/lib/i18n/locale";
import {
  STAFF_MENU_LANGUAGE_KEY,
  parseStaffMenuLanguage,
} from "@/app/lib/i18n/staffMenuLanguage";

/** The choice made on this page load — wins over storage, so a switch
 *  still works where storage is blocked or full (just not remembered). */
let chosen: AppLocale | null = null;

/** Same-tab changes (the storage event fires in OTHER tabs only). */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  // Another tab switched: its stored choice wins over this page's.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STAFF_MENU_LANGUAGE_KEY) return;
    chosen = null;
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function readStored(): AppLocale {
  if (chosen !== null) return chosen;
  // Storage blocked (private mode, policy) reads as null — English.
  return parseStaffMenuLanguage(readStorage(STAFF_MENU_LANGUAGE_KEY));
}

/**
 * The New Order menu side's language, remembered on this device. `null`
 * until the browser has read it (the server never knows it), so the page
 * can hold the menu's space instead of flashing the other language.
 */
export function useStaffMenuLanguage(): [
  AppLocale | null,
  (next: AppLocale) => void,
] {
  const language = useSyncExternalStore<AppLocale | null>(
    subscribe,
    readStored,
    () => null,
  );
  const setLanguage = useCallback((next: AppLocale) => {
    chosen = next;
    // Blocked storage: not remembered — the switch still holds for this
    // page load.
    setStorageItem(STAFF_MENU_LANGUAGE_KEY, next);
    listeners.forEach((listener) => listener());
  }, []);
  return [language, setLanguage];
}
