"use client";

import { useEffect, useState } from "react";
import {
  isKeyboardOpen,
  isTextEntry,
  isViewportShrunk,
  nextKeyboardPhase,
  type FocusTarget,
  type KeyboardEvent,
  type KeyboardPhase,
} from "@/app/lib/storefront/onScreenKeyboard";

/** The element an event points at, in the shape isTextEntry reads. */
function asFocusTarget(target: EventTarget | null): FocusTarget | null {
  return target instanceof HTMLElement ? (target as FocusTarget) : null;
}

/**
 * True while the on-screen keyboard is (probably) open: a text field on
 * the page has focus — confirmed by window.visualViewport where it can
 * tell (lib/storefront/onScreenKeyboard). Listens on the document, so no
 * page needs code of its own. Used once, by the customer bottom bar.
 */
export function useOnScreenKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Starts closed: nothing has focus when the bar first mounts.
    let phase: KeyboardPhase = "none";

    function apply(event: KeyboardEvent) {
      phase = nextKeyboardPhase(phase, event);
      setOpen(isKeyboardOpen(phase));
    }
    function onFocusIn(event: FocusEvent) {
      apply({ type: "focus", textEntry: isTextEntry(asFocusTarget(event.target)) });
    }
    // relatedTarget: where focus goes next (null when nowhere).
    function onFocusOut(event: FocusEvent) {
      apply({
        type: "focus",
        textEntry: isTextEntry(asFocusTarget(event.relatedTarget)),
      });
    }
    const viewport = window.visualViewport;
    function onViewportResize() {
      if (!viewport) return;
      apply({
        type: "viewport",
        shrunk: isViewportShrunk(window.innerHeight, viewport.height, viewport.scale),
      });
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    viewport?.addEventListener("resize", onViewportResize);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      viewport?.removeEventListener("resize", onViewportResize);
    };
  }, []);

  return open;
}
