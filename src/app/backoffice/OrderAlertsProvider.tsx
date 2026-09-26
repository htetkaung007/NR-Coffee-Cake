"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePolling } from "@/app/lib/hooks/usePolling";
import { DEFAULT_REFRESH_INTERVAL_MS } from "@/app/lib/hooks/useAutoRefresh";
import { useOrderAlertSound } from "@/app/lib/hooks/useOrderAlertSound";
import { useDocumentTitleCount } from "@/app/lib/hooks/useDocumentTitle";
import { getPendingApprovalsAction } from "./order/action";

/** One round (OrderSession) awaiting the cashier's Accept/Reject. */
export interface PendingApprovalRound {
  sessionId: number;
  /** Its Order List entry — see OrderSessionApprovalService.entryKeyFor. */
  entryKey: string;
  title: string;
  isTableGroup: boolean;
}

export interface NewPendingRoundsEvent {
  /** One item per entry that received at least one new round awaiting
   *  approval in this refresh. */
  entries: {
    key: string;
    title: string;
    isTableGroup: boolean;
    /** False when the entry (card) was already known at the previous
     *  refresh — i.e. an existing card just got another round. */
    isNewEntry: boolean;
  }[];
  /** How many new PENDING_APPROVAL rounds arrived, across all entries. */
  roundCount: number;
}

type NewRoundsListener = (event: NewPendingRoundsEvent) => void;

/** The slice of an Order List entry useFeedPendingFromList reads. */
interface ListEntry {
  key: string;
  title: string;
  isTableGroup: boolean;
  sessions: { id: number; status: string }[];
}

interface OrderAlertsContextValue {
  /** Every round awaiting approval at the selected location. */
  pending: PendingApprovalRound[];
  sound: {
    enabled: boolean;
    isLocked: boolean;
    toggle: () => void;
    /** Integer percent, MIN_VOLUME–MAX_VOLUME. */
    volume: number;
    setVolume: (percent: number) => void;
    playTest: () => void;
  };
  /** Called once per refresh that brought new rounds; returns unsubscribe. */
  subscribeToNewRounds: (listener: NewRoundsListener) => () => void;
  registerListFeed: () => () => void;
  feedFromList: (
    pending: PendingApprovalRound[],
    allEntryKeys: string[],
  ) => void;
}

const OrderAlertsContext = createContext<OrderAlertsContextValue | null>(null);

function samePending(a: PendingApprovalRound[], b: PendingApprovalRound[]) {
  return (
    a.length === b.length &&
    a.every(
      (round, index) =>
        round.sessionId === b[index].sessionId &&
        round.entryKey === b[index].entryKey &&
        round.title === b[index].title,
    )
  );
}

/** Never throws — a failed poll (offline, redeploy) just skips a beat. */
async function pollPendingApprovals() {
  try {
    const result = await getPendingApprovalsAction();
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Backoffice-wide new-order alerting, mounted once in the Backoffice
 * layout so it survives navigation between Backoffice pages: the
 * cashier hears the beep and sees the tab-title count on Menus,
 * Settings or an entry's detail page, not only on the Order List.
 *
 * Owns, in one place:
 *  - the pending-approval list (polled every 5s via usePolling);
 *  - new-round detection — compares each refresh against the session
 *    ids already seen; the first refresh only seeds that set (whatever
 *    was waiting when the Backoffice opened isn't "new"), then fires
 *    subscribers and beeps at most ONCE per refresh, however many
 *    rounds arrived together;
 *  - the sound (useOrderAlertSound) — one AudioContext for the whole
 *    Backoffice session;
 *  - the "(N) " tab-title prefix.
 *
 * No double polling: the Order List already re-fetches every 5s
 * (useAutoRefresh), so while it's mounted it feeds its own entries in
 * through useFeedPendingFromList and this provider's poll pauses.
 */
export function OrderAlertsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState<PendingApprovalRound[]>([]);
  const { enabled, isLocked, toggle, play, volume, setVolume, playTest } =
    useOrderAlertSound();

  const seenSessionIds = useRef<Set<number> | null>(null);
  const knownEntryKeys = useRef<Set<string>>(new Set());
  const listeners = useRef<Set<NewRoundsListener>>(new Set());

  const ingest = useCallback(
    (next: PendingApprovalRound[], allEntryKeys: string[]) => {
      setPending((current) => (samePending(current, next) ? current : next));

      const seen = seenSessionIds.current;
      if (seen === null) {
        seenSessionIds.current = new Set(next.map((round) => round.sessionId));
        knownEntryKeys.current = new Set(allEntryKeys);
        return;
      }

      const arrived = new Map<
        string,
        NewPendingRoundsEvent["entries"][number]
      >();
      let roundCount = 0;
      for (const round of next) {
        if (seen.has(round.sessionId)) continue;
        seen.add(round.sessionId);
        roundCount += 1;
        if (!arrived.has(round.entryKey)) {
          arrived.set(round.entryKey, {
            key: round.entryKey,
            title: round.title,
            isTableGroup: round.isTableGroup,
            isNewEntry: !knownEntryKeys.current.has(round.entryKey),
          });
        }
      }
      knownEntryKeys.current = new Set(allEntryKeys);
      if (roundCount === 0) return;

      void play();
      const event = { entries: [...arrived.values()], roundCount };
      listeners.current.forEach((listener) => listener(event));
    },
    [play],
  );

  // How many Order Lists are feeding (0 or 1; a count so StrictMode's
  // double mount/unmount can't leave it stuck). The ref answers "is the
  // list feeding right now?" for a poll that was already in flight.
  const [listFeedCount, setListFeedCount] = useState(0);
  const listFeedCountRef = useRef(0);

  const registerListFeed = useCallback(() => {
    listFeedCountRef.current += 1;
    setListFeedCount((count) => count + 1);
    return () => {
      listFeedCountRef.current -= 1;
      setListFeedCount((count) => count - 1);
    };
  }, []);

  const handlePollResult = useCallback(
    (rounds: Awaited<ReturnType<typeof pollPendingApprovals>>) => {
      // The list took over while this request was in flight — its feed
      // is at least as fresh, so don't overwrite it.
      if (!rounds || listFeedCountRef.current > 0) return;
      ingest(
        rounds.map(({ sessionId, entryKey, title, isTableGroup }) => ({
          sessionId,
          entryKey,
          title,
          isTableGroup,
        })),
        // Off the list only pending entries are known; the list's own
        // feed supplies every open entry key.
        rounds.map((round) => round.entryKey),
      );
    },
    [ingest],
  );

  const isPolling = listFeedCount === 0;
  usePolling(
    isPolling,
    DEFAULT_REFRESH_INTERVAL_MS,
    pollPendingApprovals,
    handlePollResult,
  );

  // usePolling's first tick is a full interval away — fetch straight
  // away on mount and whenever the list hands polling back, so the bar
  // and title don't wait 5s. Skipped when the list registered earlier
  // in this same commit (child effects run before this one).
  useEffect(() => {
    if (!isPolling || listFeedCountRef.current > 0) return;
    void pollPendingApprovals().then(handlePollResult);
  }, [isPolling, handlePollResult]);

  useDocumentTitleCount(pending.length);

  const subscribeToNewRounds = useCallback((listener: NewRoundsListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({
      pending,
      sound: { enabled, isLocked, toggle, volume, setVolume, playTest },
      subscribeToNewRounds,
      registerListFeed,
      feedFromList: ingest,
    }),
    [
      pending,
      enabled,
      isLocked,
      toggle,
      volume,
      setVolume,
      playTest,
      subscribeToNewRounds,
      registerListFeed,
      ingest,
    ],
  );

  return (
    <OrderAlertsContext.Provider value={value}>
      {children}
    </OrderAlertsContext.Provider>
  );
}

export function useOrderAlerts() {
  const context = useContext(OrderAlertsContext);
  if (!context) {
    throw new Error("useOrderAlerts must be used inside OrderAlertsProvider");
  }
  return context;
}

/** Runs `listener` once per refresh that brought new rounds awaiting
 *  approval. Read through a ref (fresh inline closures are fine) and
 *  subscribed in a layout effect, so a caller that also feeds (the
 *  Order List) is subscribed before its own first feed fires. */
export function useNewPendingRoundsListener(listener: NewRoundsListener) {
  const { subscribeToNewRounds } = useOrderAlerts();
  const listenerRef = useRef(listener);

  useLayoutEffect(() => {
    listenerRef.current = listener;
  });

  useLayoutEffect(
    () => subscribeToNewRounds((event) => listenerRef.current(event)),
    [subscribeToNewRounds],
  );
}

/**
 * For the Order List only: while mounted it registers as the provider's
 * data source (pausing the provider's own poll) and feeds every
 * refreshed `entries` in. Feeding runs in a layout effect so a new
 * card's "appear" cue is set before the browser paints — it starts its
 * fade-in from opacity 0 instead of flashing fully visible first.
 */
export function useFeedPendingFromList(entries: ListEntry[]) {
  const { registerListFeed, feedFromList } = useOrderAlerts();

  useEffect(() => registerListFeed(), [registerListFeed]);

  useLayoutEffect(() => {
    feedFromList(
      entries.flatMap((entry) =>
        entry.sessions
          .filter((session) => session.status === "PENDING_APPROVAL")
          .map((session) => ({
            sessionId: session.id,
            entryKey: entry.key,
            title: entry.title,
            isTableGroup: entry.isTableGroup,
          })),
      ),
      entries.map((entry) => entry.key),
    );
  }, [entries, feedFromList]);
}
