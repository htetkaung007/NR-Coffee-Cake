"use client";

import { useRouter } from "next/navigation";
import { usePolling } from "./usePolling";

/** How often the Backoffice order pages re-fetch — see useAutoRefresh. */
export const DEFAULT_REFRESH_INTERVAL_MS = 5000;

/**
 * Re-runs the current route's Server Component on a fixed cadence
 * (router.refresh) so server-rendered data — a newly submitted order's
 * red dot, a new round on a table's detail page — shows up without the
 * cashier reloading. Polling rather than a push channel for the same
 * reason the customer side polls: see usePolling. There's no value to
 * hand back (refresh() re-renders from the server), so the poll
 * function is a no-op and the refresh happens in the result callback.
 */
export function useAutoRefresh(intervalMs = DEFAULT_REFRESH_INTERVAL_MS) {
  const router = useRouter();

  usePolling(
    true,
    intervalMs,
    async () => null,
    () => router.refresh(),
  );
}
