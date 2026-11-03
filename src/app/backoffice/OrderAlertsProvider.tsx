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
import { Alert, Snackbar } from "@mui/material";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePolling } from "@/app/lib/hooks/usePolling";
import {
  acknowledge,
  parseAcknowledged,
  pruneAcknowledged,
  ringingIds,
  serializeAcknowledged,
  shouldPlayAlert,
} from "@/app/lib/hooks/orderAlertRepeat";
import {
  readStorage,
  useStoredValue,
  writeStorage,
} from "@/app/lib/hooks/useStoredValue";
import { describeWithdrawals } from "@/app/lib/order/cancelReason";
import { DEFAULT_REFRESH_INTERVAL_MS } from "@/app/lib/hooks/useAutoRefresh";
import { useOrderAlertSound } from "@/app/lib/hooks/useOrderAlertSound";
import { useDocumentTitleCount } from "@/app/lib/hooks/useDocumentTitle";
import { getPendingApprovalsAction } from "./order/action";

/** One round (OrderSession) awaiting the cashier's Accept/Reject. */
export interface PendingApprovalRound {
  sessionId: number;
  /** Its Order List entry — see OrderListService.entryKeyFor. */
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

/** A round a customer just withdrew (OrderListService.getRecentWithdrawals). */
export interface RecentWithdrawal {
  sessionId: number;
  orderNumber: string;
  tableName: string | null;
}

export const ORDER_LIST_PATH = "/backoffice/order";
/** An Order List entry's detail page; group 1 is its entryKey. */
export const ENTRY_DETAIL_PATH = /^\/backoffice\/order\/([^/]+)$/;

/** The rounds acknowledged on THIS device (a JSON list of session ids,
 *  pruned to the ones still waiting) — shared by every Backoffice tab of
 *  the browser through useStoredValue (the `storage` event). */
const ACKNOWLEDGED_STORAGE_KEY = "orders-alert-acknowledged";
const NOTHING_ACKNOWLEDGED = "[]";
// The copy for when storage is blocked (one tab only, then).
let acknowledgedInMemory = NOTHING_ACKNOWLEDGED;

function readAcknowledged() {
  return readStorage(ACKNOWLEDGED_STORAGE_KEY) ?? acknowledgedInMemory;
}

function writeAcknowledged(ids: readonly number[]) {
  const next = serializeAcknowledged(ids);
  if (next === readAcknowledged()) return;
  acknowledgedInMemory = next;
  writeStorage(ACKNOWLEDGED_STORAGE_KEY, next);
}

/** The repeat timer's tick. It only decides (shouldPlayAlert decides
 *  the 5s cadence); one tick a second keeps "at once" honest. */
const ALERT_TICK_MS = 1000;

/** How long the "Customer cancelled order …" toast stays. */
const WITHDRAWAL_TOAST_MS = 6000;

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
  /** The repeating alert: ringing while a waiting round hasn't been
   *  acknowledged on this device (and the sound is on). */
  alert: {
    isRinging: boolean;
    /** Acknowledges EVERY round waiting now — the Silence buttons, the
     *  banner and the toast's View. */
    acknowledge: () => void;
  };
  /** Called once per refresh that brought new rounds; returns unsubscribe. */
  subscribeToNewRounds: (listener: NewRoundsListener) => () => void;
  registerListFeed: () => () => void;
  feedFromList: (
    pending: PendingApprovalRound[],
    allEntryKeys: string[],
    withdrawn: RecentWithdrawal[],
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
 *    subscribers at most ONCE per refresh, however many rounds arrived
 *    together (the toast and the card cues);
 *  - the repeating alert (lib/hooks/orderAlertRepeat): ONE timer for
 *    the whole Backoffice plays the alert at once and every
 *    ALERT_REPEAT_SECONDS while a waiting round hasn't been
 *    acknowledged on this device — after a reload too. Acknowledged
 *    ids live in localStorage (pruned to what still waits), so Silence
 *    in one tab silences the others; opening a waiting entry's detail
 *    page acknowledges too. It stops on its own once nothing waits;
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
  const t = useTranslations("bo.alerts");
  const pathname = usePathname();

  // The raw string is the snapshot (a primitive, so useSyncExternalStore
  // can compare it); a broken value parses to an empty list.
  const storedAcknowledged = useStoredValue(
    readAcknowledged,
    NOTHING_ACKNOWLEDGED,
  );
  const acknowledgedIds = useMemo(
    () => parseAcknowledged(storedAcknowledged),
    [storedAcknowledged],
  );

  const seenSessionIds = useRef<Set<number> | null>(null);
  // Withdrawals already shown (or already there when the Backoffice
  // opened) — each toasts once.
  const seenWithdrawalIds = useRef<Set<number> | null>(null);
  const [withdrawalNotice, setWithdrawalNotice] = useState<{
    id: number;
    message: ReturnType<typeof describeWithdrawals>;
  } | null>(null);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  const ingestWithdrawals = useCallback((withdrawn: RecentWithdrawal[]) => {
    const seen = seenWithdrawalIds.current;
    if (seen === null) {
      seenWithdrawalIds.current = new Set(withdrawn.map((round) => round.sessionId));
      return;
    }
    const fresh = withdrawn.filter((round) => !seen.has(round.sessionId));
    if (fresh.length === 0) return;
    fresh.forEach((round) => seen.add(round.sessionId));
    setWithdrawalNotice({ id: Date.now(), message: describeWithdrawals(fresh) });
    setIsWithdrawalOpen(true);
  }, []);
  const knownEntryKeys = useRef<Set<string>>(new Set());
  const listeners = useRef<Set<NewRoundsListener>>(new Set());

  const ingest = useCallback(
    (next: PendingApprovalRound[], allEntryKeys: string[]) => {
      setPending((current) => (samePending(current, next) ? current : next));
      // Real data only (never the empty list before the first refresh,
      // which would wipe the store on every reload): forget rounds that
      // stopped waiting, so the stored list never grows. Rounds already
      // waiting when the Backoffice opened are NOT acknowledged — they
      // ring (the alert below), unless silenced before on this device.
      writeAcknowledged(
        pruneAcknowledged(
          parseAcknowledged(readAcknowledged()),
          next.map((round) => round.sessionId),
        ),
      );

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

      const event = { entries: [...arrived.values()], roundCount };
      listeners.current.forEach((listener) => listener(event));
    },
    [],
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
    (result: Awaited<ReturnType<typeof pollPendingApprovals>>) => {
      // The list took over while this request was in flight — its feed
      // is at least as fresh, so don't overwrite it.
      if (!result || listFeedCountRef.current > 0) return;
      const rounds = result.pending;
      ingestWithdrawals(result.withdrawn);
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
    [ingest, ingestWithdrawals],
  );

  /** The Order List's feed: its open entries' pending rounds, and the
   *  withdrawals it loaded alongside them. */
  const feedFromList = useCallback(
    (
      next: PendingApprovalRound[],
      allEntryKeys: string[],
      withdrawn: RecentWithdrawal[],
    ) => {
      ingestWithdrawals(withdrawn);
      ingest(next, allEntryKeys);
    },
    [ingest, ingestWithdrawals],
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

  // ── The repeating alert ─────────────────────────────────────────────
  const waitingIds = useMemo(
    () => pending.map((round) => round.sessionId),
    [pending],
  );
  const isRinging =
    enabled && ringingIds(waitingIds, acknowledgedIds).length > 0;

  // The ONE timer reads the latest facts through refs, so it's set up
  // once (not per round, not per render) and cleared on unmount.
  const lastAlertAt = useRef<number | null>(null);
  const alertFacts = useRef({ waitingIds, acknowledgedIds, enabled, play });
  useEffect(() => {
    alertFacts.current = { waitingIds, acknowledgedIds, enabled, play };
  });

  const ringIfDue = useCallback(() => {
    const facts = alertFacts.current;
    if (ringingIds(facts.waitingIds, facts.acknowledgedIds).length === 0) {
      // Nothing left to ring for — the next round rings at once.
      lastAlertAt.current = null;
      return;
    }
    const now = Date.now();
    if (
      !shouldPlayAlert({
        waitingIds: facts.waitingIds,
        acknowledgedIds: facts.acknowledgedIds,
        lastAlertAt: lastAlertAt.current,
        now,
        soundEnabled: facts.enabled,
      })
    ) {
      return;
    }
    lastAlertAt.current = now;
    // Silent (never throws) while audio is still locked after a reload.
    void facts.play();
  }, []);

  useEffect(() => {
    const timer = setInterval(ringIfDue, ALERT_TICK_MS);
    return () => clearInterval(timer);
  }, [ringIfDue]);

  // Straight away — not a tick later — when a refresh brings a round,
  // an acknowledgement lands (this tab or another) or the sound changes.
  useEffect(() => {
    ringIfDue();
  }, [waitingIds, acknowledgedIds, enabled, ringIfDue]);

  // Audio just unlocked (the first tap after a reload): ring now instead
  // of waiting out the interval of the alert the browser refused.
  useEffect(() => {
    if (isLocked) return;
    lastAlertAt.current = null;
    ringIfDue();
  }, [isLocked, ringIfDue]);

  /** Acknowledges every round waiting now, on this device. */
  const acknowledgeAlert = useCallback(() => {
    const facts = alertFacts.current;
    writeAcknowledged(acknowledge(facts.waitingIds, facts.acknowledgedIds));
    lastAlertAt.current = null;
  }, []);

  // Opening a waiting entry's detail page acknowledges (every round, as
  // Silence does). Any other page — New Order, Menus — never does.
  const viewingEntryKey = ENTRY_DETAIL_PATH.exec(pathname)?.[1] ?? null;
  const isViewingWaitingEntry =
    viewingEntryKey !== null &&
    pending.some(
      (round) =>
        round.entryKey === viewingEntryKey &&
        !acknowledgedIds.includes(round.sessionId),
    );
  useEffect(() => {
    if (isViewingWaitingEntry) acknowledgeAlert();
  }, [isViewingWaitingEntry, acknowledgeAlert]);

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
      alert: { isRinging, acknowledge: acknowledgeAlert },
      subscribeToNewRounds,
      registerListFeed,
      feedFromList,
    }),
    [
      pending,
      enabled,
      isLocked,
      toggle,
      volume,
      setVolume,
      playTest,
      isRinging,
      acknowledgeAlert,
      subscribeToNewRounds,
      registerListFeed,
      feedFromList,
    ],
  );

  return (
    <OrderAlertsContext.Provider value={value}>
      {children}
      {/* On every Backoffice page: a customer withdrew a round that was
          waiting for approval — it leaves "Needs approval" on the next
          refresh, this says why (once). Info, not warning: nothing to do. */}
      <Snackbar
        key={withdrawalNotice?.id}
        open={isWithdrawalOpen}
        autoHideDuration={WITHDRAWAL_TOAST_MS}
        onClose={() => setIsWithdrawalOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          variant="filled"
          role="status"
          onClose={() => setIsWithdrawalOpen(false)}
          sx={{ width: "100%" }}
        >
          {withdrawalNotice &&
            t(withdrawalNotice.message.key, withdrawalNotice.message.values)}
        </Alert>
      </Snackbar>
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
export function useFeedPendingFromList(
  entries: ListEntry[],
  withdrawn: RecentWithdrawal[],
) {
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
      withdrawn,
    );
  }, [entries, withdrawn, feedFromList]);
}
