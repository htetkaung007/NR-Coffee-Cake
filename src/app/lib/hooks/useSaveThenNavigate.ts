"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SaveResult =
  | { success: true }
  | { success: false; error: { message: string } };

/**
 * The Backoffice create/edit pages' submit: run the Server Action in a
 * transition (isPending disables the button), show its safe error
 * inline, or on success show the success toast for a beat and then go
 * to `href` (router.push — redirect() only works on the server).
 */
export function useSaveThenNavigate() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save(run: () => Promise<SaveResult>, href: string) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.success) {
        setError(result.error.message);
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
