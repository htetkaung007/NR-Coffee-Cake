"use client";

import { useEffect, useState } from "react";

/** The given value, delayed by `delayMs` of no further changes — the
 *  shared ~300ms search-input debounce (see DESIGN.md Rule 16). Resets
 *  its timer on every change, so a value only "settles" once typing
 *  pauses. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
