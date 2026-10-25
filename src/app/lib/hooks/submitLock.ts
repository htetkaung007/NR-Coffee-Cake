/**
 * The submit lock's rule, pure (useSubmitLock wraps it for React).
 *
 * `run(task)` returns at once while locked; otherwise it locks BEFORE
 * awaiting the task — synchronously, in the same tap — so a second tap
 * that lands before React re-renders is ignored (state alone only
 * disables the button after that re-render). When the task ends,
 * returns or throws, the lock opens again (try/finally) — unless the
 * task called `keepLocked()` (success, the page is about to leave):
 * then it stays shut until `unlock()`.
 *
 * A task that THROWS (a Server Action's network drop) is handed to
 * `onError` when one is given — caught, so the caller's `void run(...)`
 * never leaves an unhandled rejection; without one the throw reaches the
 * caller. Either way the lock opens first.
 */
export interface SubmitLock {
  readonly isLocked: boolean;
  /** Locked by keepLocked() — the task succeeded and nothing more may
   *  be sent ("Created ✓" until the page leaves). */
  readonly isKept: boolean;
  run(task: () => Promise<void>, onError?: (error: unknown) => void): Promise<void>;
  keepLocked(): void;
  unlock(): void;
}

export interface SubmitLockState {
  isLocked: boolean;
  isKept: boolean;
}

export function createSubmitLock(
  onChange?: (state: SubmitLockState) => void,
): SubmitLock {
  let isLocked = false;
  let isKept = false;

  function set(nextLocked: boolean, nextKept: boolean) {
    if (nextLocked === isLocked && nextKept === isKept) return;
    isLocked = nextLocked;
    isKept = nextKept;
    onChange?.({ isLocked, isKept });
  }

  return {
    get isLocked() {
      return isLocked;
    },
    get isKept() {
      return isKept;
    },
    async run(task, onError) {
      if (isLocked) return;
      set(true, false);
      try {
        await task();
      } catch (error) {
        if (!isKept) set(false, false);
        if (!onError) throw error;
        onError(error);
      } finally {
        if (!isKept) set(false, false);
      }
    },
    keepLocked() {
      if (isLocked) set(true, true);
    },
    unlock() {
      set(false, false);
    },
  };
}
