/**
 * The new-order alert's numbers and rules — pure; the sound itself is
 * useOrderAlertSound.
 */

export const MIN_VOLUME = 10;
export const MAX_VOLUME = 100;
/** First use only — a volume already saved on this device stays. */
export const DEFAULT_VOLUME = 80;

/** While a round waits unacknowledged, the alert plays again this often
 *  (orderAlertRepeat) — ONE number. */
export const ALERT_REPEAT_SECONDS = 5;

export const BEEP_COUNT = 3;
export const BEEP_SECONDS = 0.15;
const BEEP_GAP_SECONDS = 0.1;

/** What may start audio after a reload. Never pointerdown: on a touch
 *  screen the finger LIFTING is the user activation, so a resume() on
 *  pointerdown is refused (iOS Safari keeps refusing later ones too). */
export const UNLOCK_GESTURES = [
  "pointerup",
  "touchend",
  "click",
  "keydown",
] as const;

export function clampVolume(percent: number) {
  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, Math.round(percent)));
}

/** A saved volume (localStorage), or `fallback` when there's none or it
 *  isn't a number. */
export function volumeFromStorage(stored: string | null, fallback: number) {
  if (stored !== null) {
    const percent = Number(stored);
    if (Number.isFinite(percent)) return clampVolume(percent);
  }
  return fallback;
}

/** When each beep starts, in seconds from the first. */
export function beepStartOffsets() {
  return Array.from(
    { length: BEEP_COUNT },
    (_, index) => index * (BEEP_SECONDS + BEEP_GAP_SECONDS),
  );
}
