"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffErrorMessage, useStaffGenericError } from "./useStaffWords";
import { useSubmitLock } from "./useSubmitLock";

type SaveResult =
  | { success: true }
  | {
      success: false;
      error: { message: string; code: string; params?: Record<string, string | number> };
    };

/**
 * The Backoffice create/edit pages' submit: run the Server Action under
 * the submit lock (useSubmitLock — a second tap is ignored from the very
 * first one), show its safe error inline (in the staff's language —
 * useStaffErrorMessage) and unlock, or on success show the success toast
 * for a beat and then go to `href` (router.push — redirect() only works
 * on the server). After success it stays locked (`status` "done") until
 * the page leaves, so the button can't send again during the toast.
 */
export function useSaveThenNavigate() {
  const router = useRouter();
  const errorText = useStaffErrorMessage();
  const genericError = useStaffGenericError();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const lock = useSubmitLock();

  function save(run: () => Promise<SaveResult>, href: string) {
    void lock.run(async () => {
      setError(null);
      const result = await run();
      if (!result.success) {
        setError(errorText(result.error));
        return;
      }
      lock.keepLocked();
      setShowSuccess(true);
      setTimeout(() => {
        router.push(href);
      }, 1000);
    }, () => setError(genericError));
  }

  return {
    error,
    setError,
    /** Sending, or sent and about to leave — the submit stays disabled. */
    isBusy: lock.isLocked,
    /** For SubmitButton: idle → busy → done ("Created ✓"). */
    status: lock.status,
    showSuccess,
    closeSuccess: () => setShowSuccess(false),
    save,
  };
}
