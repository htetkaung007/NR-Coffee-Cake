/** Time left for the counter to confirm a Counter QR round, and how long
 *  ago a Table round was sent — as the customer sees them. Pure.
 *
 *  The SERVER measures (secondsUntil / secondsSince with its own clock);
 *  the phone only counts down from that with a monotonic timer
 *  (performance.now), so a wrong or changed phone clock never matters.
 *  Client-safe: the server-side half is approvalTiming.ts. */

/** Whole seconds from `now` until `deadline`, never below 0 — computed
 *  on the server. */
export function secondsUntil(deadline: Date, now: Date): number {
  return Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 1000));
}

/** Whole seconds from `since` to `now`, never below 0 — computed on the
 *  server. */
export function secondsSince(since: Date, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - since.getTime()) / 1000));
}

/** THE "time left": the server's figure minus what has elapsed since,
 *  rounded UP to whole seconds (it reads 1 until it really is 0), never
 *  below 0. Also behind the Backoffice's own approval timer. */
export function remainingSeconds(
  serverSecondsRemaining: number,
  elapsedMs: number,
): number {
  return Math.max(0, Math.ceil(serverSecondsRemaining - elapsedMs / 1000));
}

/** "10 min left" (minutes rounded up), "45 sec left", and at 0
 *  "Checking with the counter…" — until the next poll moves the round on. */
export function remainingLabel(seconds: number): string {
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} min left`;
  if (seconds > 0) return `${seconds} sec left`;
  return "Checking with the counter…";
}

/** How full the bar is: the share of the window still left, 0..1. */
export function progressFraction(seconds: number, windowSeconds: number): number {
  if (windowSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, seconds / windowSeconds));
}

/** The moments a screen reader is told about — never every second. */
const ANNOUNCEMENTS: readonly [threshold: number, message: string][] = [
  [60, "1 minute left to confirm"],
  [120, "2 minutes left to confirm"],
  [300, "5 minutes left to confirm"],
];

/** A short message ONLY when the time left crosses 5, 2 or 1 minutes
 *  between two ticks (the lowest one crossed, if a re-sync jumps past
 *  several); otherwise null — also on the very first reading. */
export function announcementFor(
  previousSeconds: number | null,
  currentSeconds: number,
): string | null {
  if (previousSeconds === null) return null;
  const crossed = ANNOUNCEMENTS.find(
    ([threshold]) => previousSeconds > threshold && currentSeconds <= threshold,
  );
  return crossed ? crossed[1] : null;
}

/** "Sent just now" / "Sent 3 min ago" / "Sent 1 h ago" — a Table round,
 *  which has no deadline. */
export function sentAgoLabel(seconds: number): string {
  if (seconds < 60) return "Sent just now";
  if (seconds < 3600) return `Sent ${Math.floor(seconds / 60)} min ago`;
  return `Sent ${Math.floor(seconds / 3600)} h ago`;
}
