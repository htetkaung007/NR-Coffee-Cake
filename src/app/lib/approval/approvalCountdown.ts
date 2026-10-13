/** Time left for the counter to confirm a Counter QR round, and how long
 *  ago a Table round was sent — as the customer sees them, in
 *  `approval` message keys (the words are in messages/*.json). Pure.
 *
 *  The SERVER measures the time left (approvalTiming, its own clock);
 *  the phone only counts down from that with a monotonic timer
 *  (performance.now), so a wrong or changed phone clock never matters.
 *  Client-safe: the server-side half is approvalTiming.ts. */

/** THE "time left": the server's figure minus what has elapsed since,
 *  rounded UP to whole seconds (it reads 1 until it really is 0), never
 *  below 0. Also behind the Backoffice's own approval timer. */
export function remainingSeconds(
  serverSecondsRemaining: number,
  elapsedMs: number,
): number {
  return Math.max(0, Math.ceil(serverSecondsRemaining - elapsedMs / 1000));
}

/** The time left in words — as an `approval` message (messages/*.json):
 *  "10 min left" (minutes rounded up), "45 sec left", and at 0
 *  "Checking with the counter…" — until the next poll moves the round on. */
export type RemainingMessage =
  | { key: "minutesLeft"; values: { minutes: number } }
  | { key: "secondsLeft"; values: { seconds: number } }
  | { key: "checking" };

export function remainingLabel(seconds: number): RemainingMessage {
  if (seconds >= 60) return { key: "minutesLeft", values: { minutes: Math.ceil(seconds / 60) } };
  if (seconds > 0) return { key: "secondsLeft", values: { seconds } };
  return { key: "checking" };
}

/** How full the bar is: the share of the window still left, 0..1. */
export function progressFraction(seconds: number, windowSeconds: number): number {
  if (windowSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, seconds / windowSeconds));
}

/** The minute marks a screen reader is told about — never every second. */
const ANNOUNCED_MINUTES = [1, 2, 5] as const;

/** The minute mark (5, 2 or 1) the time left crosses between two ticks
 *  — the lowest one crossed, if a re-sync jumps past several; otherwise
 *  null — also on the very first reading. */
export function announcementFor(
  previousSeconds: number | null,
  currentSeconds: number,
): number | null {
  if (previousSeconds === null) return null;
  const crossed = ANNOUNCED_MINUTES.find(
    (minutes) => previousSeconds > minutes * 60 && currentSeconds <= minutes * 60,
  );
  return crossed ?? null;
}

/** Under a minute since it was sent: "Sent just now" — otherwise the
 *  screen says how long ago (next-intl's relative time). */
export function isJustSent(secondsSinceSent: number): boolean {
  return secondsSinceSent < 60;
}

/** Everything the waiting panel says, as `approval` message keys — the
 *  Counter copy (the round cancels itself at the deadline) or the Table
 *  copy (a soft target: past it, the round is only "taking longer"). The
 *  subtitle ("Usually confirmed within a few minutes.") is the same for
 *  both. */
export interface WaitingCopy {
  title: "counterTitle" | "tableTitle";
  /** The line under the bar — takes {time}. */
  deadline: "counterDeadline" | "tableDeadline";
  /** The calm nudge in the last 2 minutes — Counter only; takes {number}. */
  hint: "counterHint" | null;
  /** Shown instead of the bar once the target has passed — Table only
   *  (a Counter round at 0 keeps "Checking with the counter…"). */
  overdue: "tableOverdue" | null;
}

const COUNTER_COPY: WaitingCopy = {
  title: "counterTitle",
  deadline: "counterDeadline",
  hint: "counterHint",
  overdue: null,
};

const TABLE_COPY: WaitingCopy = {
  title: "tableTitle",
  deadline: "tableDeadline",
  hint: null,
  overdue: "tableOverdue",
};

export function waitingCopy(autoCancels: boolean): WaitingCopy {
  return autoCancels ? COUNTER_COPY : TABLE_COPY;
}

/** What the screen reader hears between two ticks: the 5 / 2 / 1-minute
 *  marks (announcementFor) for both kinds of round, and — for a Table
 *  round, once, as it reaches its soft target — the "taking longer"
 *  message. null otherwise, and on the first reading. */
export type WaitingAnnouncement =
  | { key: "minutesLeftToConfirm"; values: { minutes: number } }
  | { key: "tableOverdue" };

export function waitingAnnouncement(
  previousSeconds: number | null,
  currentSeconds: number,
  autoCancels: boolean,
): WaitingAnnouncement | null {
  const minutes = announcementFor(previousSeconds, currentSeconds);
  if (minutes !== null) return { key: "minutesLeftToConfirm", values: { minutes } };
  const overdue = waitingCopy(autoCancels).overdue;
  const reachedZero =
    previousSeconds !== null && previousSeconds > 0 && currentSeconds === 0;
  return overdue && reachedZero ? { key: overdue } : null;
}
