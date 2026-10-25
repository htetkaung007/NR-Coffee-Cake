"use client";

import { useState } from "react";
import { createSubmitLock, type SubmitLockState } from "./submitLock";
import type { SubmitStatus } from "@/app/components/SubmitButton";

/**
 * Stops double submits: every handler that calls a create / submit / add
 * Server Action runs it through `run(task)`. The lock is a plain mutable
 * flag held for the component's life (like a ref — read and set
 * synchronously, never waiting for a render), so a second tap before
 * React re-renders is already refused; `isLocked` / `status` mirror it
 * as state so the button re-renders disabled with its busy label.
 *
 * - error result → unlocks by itself; the caller shows the error and
 *   the button is back to its idle label.
 * - throw (a network drop) → unlocks, then `onError(error)`: REQUIRED,
 *   so every caller shows its generic error in its own words and no
 *   `void run(...)` leaves an unhandled rejection.
 * - success → call `keepLocked()` when the page (or dialog) is about to
 *   leave: it stays locked, `status` "done", until `unlock()` (a dialog
 *   calls it when it opens again).
 *
 * The rule is pure in ./submitLock (tested); useSaveThenNavigate uses
 * this for the create / edit pages.
 */
export function useSubmitLock() {
  const [state, setState] = useState<SubmitLockState>({
    isLocked: false,
    isKept: false,
  });
  // Created once (a lazy initial state, so never re-created on render).
  const [lock] = useState(() => createSubmitLock(setState));

  const status: SubmitStatus = state.isKept
    ? "done"
    : state.isLocked
      ? "busy"
      : "idle";

  return {
    run: (task: () => Promise<void>, onError: (error: unknown) => void) =>
      lock.run(task, onError),
    keepLocked: lock.keepLocked,
    unlock: lock.unlock,
    isLocked: state.isLocked,
    status,
  };
}
