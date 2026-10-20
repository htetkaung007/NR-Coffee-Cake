"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useStaffErrorMessage } from "./useStaffWords";

type SaveResult =
  | { success: true }
  | {
      success: false;
      error: { message: string; code: string; params?: Record<string, string | number> };
    };

/**
 * The Backoffice create/edit pages' submit: run the Server Action in a
 * transition (isPending disables the button), show its safe error
 * inline (in the staff's language — useStaffErrorMessage), or on success show the success toast for a beat and then go
 * to `href` (router.push — redirect() only works on the server).
 */
export function useSaveThenNavigate() {
  const router = useRouter();
  const errorText = useStaffErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save(run: () => Promise<SaveResult>, href: string) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.success) {
        setError(errorText(result.error));
        return;
      }
      setShowSuccess(true);
      setTimeout(() => {
        router.push(href);
      }, 1000);
    });
  }

  return {
    error,
    setError,
    isPending,
    showSuccess,
    closeSuccess: () => setShowSuccess(false),
    save,
  };
}
