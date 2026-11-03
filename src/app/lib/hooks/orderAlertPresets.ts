/**
 * The new-order alert's sounds, as DATA — pure and client-safe;
 * useOrderAlertSound turns them into Web Audio (no audio files). Each
 * note is one oscillator per partial, all with the same envelope (see
 * noteVoices). The notes are the owner-approved ones; "classic" is the
 * original alert (three 880 Hz beeps) and the default. Names are
 * bo.alerts.presets.<id> in messages/*.json (tested). The player takes a
 * preset, not an id, so a later "shop sound" (an uploaded file) can join
 * this list as another kind of entry without changing its callers.
 */

export interface AlertNote {
  /** The fundamental, in Hz. */
  hz: number;
  wave: OscillatorType;
  /** Seconds from the alert's start. */
  start: number;
  /** Seconds until the note has faded out. */
  length: number;
  /** Relative level, (0, 1] — scaled by the volume. */
  gain: number;
  /** [frequency ratio, amplitude] per partial, for bell-like tones;
   *  none = one plain tone ([1, 1]). */
  partials?: readonly (readonly [ratio: number, amplitude: number])[];
}

const ALERT_PRESET_IDS = [
  "classic",
  "chime",
  "highAlert",
  "softBell",
  "rising",
] as const;
export type AlertPresetId = (typeof ALERT_PRESET_IDS)[number];

export interface AlertPreset {
  id: AlertPresetId;
  notes: readonly AlertNote[];
}

const BELL_PARTIALS = [
  [1, 1],
  [2, 0.3],
  [3, 0.12],
] as const;

export const ALERT_PRESETS: readonly AlertPreset[] = [
  {
    id: "classic",
    notes: [
      { hz: 880, wave: "sine", start: 0, length: 0.15, gain: 1 },
      { hz: 880, wave: "sine", start: 0.25, length: 0.15, gain: 1 },
      { hz: 880, wave: "sine", start: 0.5, length: 0.15, gain: 1 },
    ],
  },
  {
    id: "chime",
    notes: [
      {
        hz: 1318.5,
        wave: "sine",
        start: 0,
        length: 0.7,
        gain: 1,
        partials: BELL_PARTIALS,
      },
      {
        hz: 1046.5,
        wave: "sine",
        start: 0.45,
        length: 0.9,
        gain: 1,
        partials: BELL_PARTIALS,
      },
    ],
  },
  {
    id: "highAlert",
    notes: [
      { hz: 1568, wave: "square", start: 0, length: 0.08, gain: 0.45 },
      { hz: 1976, wave: "square", start: 0.13, length: 0.08, gain: 0.45 },
      { hz: 1568, wave: "square", start: 0.26, length: 0.08, gain: 0.45 },
      { hz: 1976, wave: "square", start: 0.39, length: 0.08, gain: 0.45 },
      { hz: 1568, wave: "square", start: 0.52, length: 0.08, gain: 0.45 },
    ],
  },
  {
    id: "softBell",
    notes: [
      {
        hz: 784,
        wave: "sine",
        start: 0,
        length: 1.4,
        gain: 0.9,
        partials: [
          [1, 1],
          [2.76, 0.35],
          [5.4, 0.12],
        ],
      },
    ],
  },
  {
    id: "rising",
    notes: [
      { hz: 1046.5, wave: "triangle", start: 0, length: 0.14, gain: 1 },
      { hz: 1318.5, wave: "triangle", start: 0.2, length: 0.14, gain: 1 },
      { hz: 1568, wave: "triangle", start: 0.4, length: 0.3, gain: 1 },
    ],
  },
];

export const DEFAULT_ALERT_PRESET: AlertPresetId = "classic";

/** The preset with this id — classic for anything unknown. */
export function alertPreset(id: AlertPresetId): AlertPreset {
  return (
    ALERT_PRESETS.find((preset) => preset.id === id) ??
    (ALERT_PRESETS[0] as AlertPreset)
  );
}

/** A saved sound (localStorage), or classic when there's none or it
 *  isn't one of the presets. Never throws. */
export function presetFromStorage(stored: string | null): AlertPresetId {
  return ALERT_PRESET_IDS.find((id) => id === stored) ?? DEFAULT_ALERT_PRESET;
}

/** Seconds until the preset's last note has faded out. */
export function presetDuration(preset: AlertPreset) {
  return Math.max(...preset.notes.map((note) => note.start + note.length));
}

/** One oscillator to play: frequency, wave, peak level and its time span
 *  (seconds from the alert's start). */
export interface AlertVoice {
  frequency: number;
  wave: OscillatorType;
  level: number;
  start: number;
  end: number;
}

/**
 * A note as the oscillators that play it: one per partial at hz × ratio.
 * The note's level (the volume's peak × the note's gain) is split across
 * its partials in proportion to their amplitudes, so a bell is never
 * louder than a plain note.
 */
export function noteVoices(note: AlertNote, peakLevel: number): AlertVoice[] {
  const partials = note.partials ?? [[1, 1] as const];
  const totalAmplitude = partials.reduce(
    (sum, [, amplitude]) => sum + amplitude,
    0,
  );
  return partials.map(([ratio, amplitude]) => ({
    frequency: note.hz * ratio,
    wave: note.wave,
    level: (peakLevel * note.gain * amplitude) / totalAmplitude,
    start: note.start,
    end: note.start + note.length,
  }));
}
