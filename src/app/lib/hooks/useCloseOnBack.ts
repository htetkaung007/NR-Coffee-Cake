"use client";

import { useEffect, useRef } from "react";

/**
 * The browser's Back closes this overlay (DESIGN.md Rule 17), not the
 * page under it: while mounted it adds ONE history entry; Back pops it
 * and calls `onClose`, and closing any other way (×, Escape, a tap
 * outside — the caller unmounts it) removes the entry again, so the
 * history is as it was. Mount the overlay only while it's open.
 * `onClose` is read through a ref, so a fresh inline function is fine.
 */
export function useCloseOnBack(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    let popped = false;
    function handlePopState() {
      popped = true;
      onCloseRef.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!popped) window.history.back();
    };
  }, []);
}
