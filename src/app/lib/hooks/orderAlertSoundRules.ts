/**
 * The new-order alert's numbers and rules — pure; the sound itself is
 * useOrderAlertSound.
 */

export const MIN_VOLUME = 10;
export const MAX_VOLUME = 100;
/** First use only — a volume already saved on this device stays. */
export const DEFAULT_VOLUME = 80;

/** The repeat choices in Alert settings (orderAlertRepeat): "once" =
 *  one alert per newly waiting round, no repeat; a number = the seconds
 *  between repeats while a round waits unacknowledged. A new round always
 *  rings at once, whatever the choice. Per device (useOrderAlertSound). */
export const ALERT_REPEAT_CHOICES = ["once", 3, 5, 10, 30] as const;
export type AlertRepeat = (typeof ALERT_REPEAT_CHOICES)[number];

/** The default repeat — ONE number. */
export const ALERT_REPEAT_SECONDS = 5 satisfies AlertRepeat;

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

/** A saved repeat choice (localStorage), or the 5s default when there's
 *  none or it isn't one of the choices. Never throws. */
export function repeatFromStorage(stored: string | null): AlertRepeat {
  return (
    ALERT_REPEAT_CHOICES.find((choice) => String(choice) === stored) ??
    ALERT_REPEAT_SECONDS
  );
}

export function serializeRepeat(choice: AlertRepeat) {
  return String(choice);
}
