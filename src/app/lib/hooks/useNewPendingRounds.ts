"use client";

import { useLayoutEffect, useRef } from "react";

/** The slice of an Order List entry this hook needs. */
interface WatchedEntry {
  key: string;
  title: string;
  isTableGroup: boolean;
  sessions: { id: number; status: string }[];
}

export interface NewPendingRoundsEvent {
  /** One item per entry that received at least one new round awaiting
   *  approval in this refresh. */
  entries: {
    key: string;
    title: string;
    isTableGroup: boolean;
    /** False when the entry (card) was already on the list at the
     *  previous refresh — i.e. an existing card just got another round. */
    isNewEntry: boolean;
  }[];
  /** How many new PENDING_APPROVAL rounds arrived, across all entries. */
  roundCount: number;
}

/**
 * Tells the Order List when a round newly needs approval, so the
 * cashier notices without watching the screen. Compares each refreshed
 * `entries` against the PENDING_APPROVAL session ids already seen; the
 * first pass only seeds that set (whatever was waiting when the page
 * opened is not "new"). `onNewRounds` fires at most once per refresh
 * with everything that arrived together, so callers can show one
 * combined toast and beep once.
 *
 * Fed by whatever refreshes `entries` (useAutoRefresh's router.refresh)
 * — this hook doesn't poll on its own. The callback is read through a
 * ref, like usePolling's, so callers can pass a fresh inline closure
 * every render. Layout effects (not useEffect) so a caller's resulting
 * state change re-renders before the browser paints — a brand-new
 * card can then start its fade-in from opacity 0 instead of flashing
 * fully visible for one frame first.
 */
export function useNewPendingRounds(
  entries: WatchedEntry[],
  onNewRounds: (event: NewPendingRoundsEvent) => void,
) {
  const seenSessionIds = useRef<Set<number> | null>(null);
  const knownEntryKeys = useRef<Set<string>>(new Set());
  const onNewRoundsRef = useRef(onNewRounds);

  useLayoutEffect(() => {
    onNewRoundsRef.current = onNewRounds;
  });

  useLayoutEffect(() => {
    const currentKeys = new Set(entries.map((entry) => entry.key));

    if (seenSessionIds.current === null) {
      seenSessionIds.current = new Set(
        entries.flatMap((entry) =>
          entry.sessions
            .filter((session) => session.status === "PENDING_APPROVAL")
            .map((session) => session.id),
        ),
      );
      knownEntryKeys.current = currentKeys;
      return;
    }

    const seen = seenSessionIds.current;
    const arrived: NewPendingRoundsEvent["entries"] = [];
    let roundCount = 0;

    for (const entry of entries) {
      const newIds = entry.sessions
        .filter(
          (session) =>
            session.status === "PENDING_APPROVAL" && !seen.has(session.id),
        )
        .map((session) => session.id);
      if (newIds.length === 0) continue;

      newIds.forEach((id) => seen.add(id));
      roundCount += newIds.length;
      arrived.push({
        key: entry.key,
        title: entry.title,
        isTableGroup: entry.isTableGroup,
        isNewEntry: !knownEntryKeys.current.has(entry.key),
      });
    }

    knownEntryKeys.current = currentKeys;
    if (arrived.length > 0) {
      onNewRoundsRef.current({ entries: arrived, roundCount });
    }
  }, [entries]);
}
