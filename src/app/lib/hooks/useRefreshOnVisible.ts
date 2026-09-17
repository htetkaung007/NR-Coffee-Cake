"use client";

import { useEffect, useRef } from "react";

/**
 * Calls onVisible once whenever this tab goes from hidden back to
 * visible (see the visibilitychange event / document.visibilityState)
 * — e.g. the customer switched to another app to check something and
 * came back. Deliberately NOT a timer/interval: per design feedback,
 * TableOrderClient shouldn't re-render every few seconds while
 * someone's just browsing (see its own comment), but a stale "this
 * table's order was closed" state should still resolve itself the
 * next time the customer actually looks at the screen again, without
 * needing them to manually reload.
 */
export function useRefreshOnVisible(onVisible: () => void) {
  const onVisibleRef = useRef(onVisible);

  // Same reasoning as usePolling's own ref — callers pass a fresh
  // inline closure every render, and the listener below is only
  // attached once (see the effect below), so it needs a ref to always
  // call the LATEST onVisible rather than whichever one happened to
  // be current the one time the listener was attached.
  useEffect(() => {
    onVisibleRef.current = onVisible;
  });

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        onVisibleRef.current();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
}
