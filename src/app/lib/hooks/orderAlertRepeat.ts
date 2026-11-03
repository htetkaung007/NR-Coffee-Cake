/**
 * The repeating new-order alert's rule — pure; OrderAlertsProvider owns
 * the timer and the sound (useOrderAlertSound).
 *
 * A round awaiting approval rings at once, then every few seconds (the
 * device's repeat choice, "once" = no repeat) until someone on THIS
 * device acknowledges it. An acknowledgement covers every round waiting at
 * that moment; a round arriving later rings again. The acknowledged ids
 * are kept per device (localStorage, via useStoredValue) and pruned to
 * the rounds still waiting, so the list never grows.
 */
import type { AlertRepeat } from "./orderAlertSoundRules";

/** Waiting rounds nobody on this device has acknowledged yet. */
export function ringingIds(
  waitingIds: readonly number[],
  acknowledgedIds: readonly number[],
) {
  const acknowledged = new Set(acknowledgedIds);
  return waitingIds.filter((id) => !acknowledged.has(id));
}

/**
 * Play the alert now? Only with the sound on and at least one
 * unacknowledged round waiting. Then:
 *  - a waiting round that hasn't rung yet (not in `alertedIds` — the
 *    rounds rung for since ringing last stopped) rings AT ONCE, in every
 *    mode;
 *  - otherwise it repeats once `repeat` seconds have passed since the
 *    last alert — never with "once".
 * Times in ms.
 */
export function shouldPlayAlert({
  waitingIds,
  acknowledgedIds,
  alertedIds,
  lastAlertAt,
  now,
  soundEnabled,
  repeat,
}: {
  waitingIds: readonly number[];
  acknowledgedIds: readonly number[];
  alertedIds: readonly number[];
  lastAlertAt: number | null;
  now: number;
  soundEnabled: boolean;
  repeat: AlertRepeat;
}) {
  if (!soundEnabled) return false;
  const ringing = ringingIds(waitingIds, acknowledgedIds);
  if (ringing.length === 0) return false;
  const alerted = new Set(alertedIds);
  if (ringing.some((id) => !alerted.has(id))) return true;
  if (repeat === "once" || lastAlertAt === null) return false;
  return now - lastAlertAt >= repeat * 1000;
}

/** Acknowledges EVERY round waiting now (plus those acknowledged before). */
export function acknowledge(
  waitingIds: readonly number[],
  acknowledgedIds: readonly number[],
) {
  return [...new Set([...acknowledgedIds, ...waitingIds])];
}

/** Only the acknowledged rounds that are still waiting for approval. */
export function pruneAcknowledged(
  acknowledgedIds: readonly number[],
  waitingIds: readonly number[],
) {
  const waiting = new Set(waitingIds);
  return acknowledgedIds.filter((id) => waiting.has(id));
}

/** The stored list (a JSON array of round ids). Missing, broken or
 *  unreadable → an empty list; never throws. */
export function parseAcknowledged(stored: string | null): number[] {
  if (stored === null) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is number => Number.isSafeInteger(id) && id > 0,
    );
  } catch {
    return [];
  }
}

export function serializeAcknowledged(acknowledgedIds: readonly number[]) {
  return JSON.stringify(acknowledgedIds);
}
