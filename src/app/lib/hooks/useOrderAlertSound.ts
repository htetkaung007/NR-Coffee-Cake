"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALERT_REPEAT_SECONDS,
  DEFAULT_VOLUME,
  UNLOCK_GESTURES,
  clampVolume,
  repeatFromStorage,
  serializeRepeat,
  volumeFromStorage,
  type AlertRepeat,
} from "./orderAlertSoundRules";
import {
  DEFAULT_ALERT_PRESET,
  alertPreset,
  noteVoices,
  presetFromStorage,
  type AlertPreset,
  type AlertPresetId,
} from "./orderAlertPresets";
import { readStorage, useStoredValue, writeStorage } from "./useStoredValue";

/**
 * Optional alert sound when a round newly needs approval, on any Backoffice
 * page. OFF by default; the choice is remembered in localStorage
 * (with an in-memory copy for when storage is blocked, like
 * useConfirmedRoundDismissed). No audio files — one short
 * OscillatorNode tone through the Web Audio API.
 *
 * Browsers never prompt for sound; they just refuse to play until the
 * page has had a user gesture, and a reloaded page's AudioContext
 * starts "suspended" again even though the saved preference says "on".
 * So:
 *  - turning the toggle ON is the gesture: it creates/resumes the
 *    context and plays one test alert straight away (instant proof it
 *    works);
 *  - an "on" preference restored after a reload shows `isLocked`
 *    (callers render a "Tap anywhere to enable sound" hint) and a
 *    gesture anywhere (UNLOCK_GESTURES) unlocks it — every one tries
 *    again until the audio is really running;
 *  - play() always awaits resume() before making sound.
 * An alert is the device's chosen sound (lib/hooks/orderAlertPresets —
 * five synthesized presets, "classic" = three short beeps, the default).
 * Volume (10–100%, default 80), the sound and the repeat choice
 * (orderAlertSoundRules' ALERT_REPEAT_CHOICES, default 5s) are
 * remembered the same way, each under its own key — per device, and two
 * tabs stay in step (useStoredValue follows the `storage` event).
 * Called only from OrderAlertsProvider (mounted in the Backoffice
 * layout), so there's one AudioContext, held in a ref, for the whole
 * Backoffice session.
 */

const STORAGE_KEY = "orders-alert-sound";
const VOLUME_STORAGE_KEY = "orders-alert-volume";
const PRESET_STORAGE_KEY = "orders-alert-preset";
const REPEAT_STORAGE_KEY = "orders-alert-repeat";
let enabledInMemory = false;
let volumeInMemory = DEFAULT_VOLUME;
let presetInMemory: AlertPresetId = DEFAULT_ALERT_PRESET;
let repeatInMemory: AlertRepeat = ALERT_REPEAT_SECONDS;

function readEnabled() {
  const stored = readStorage(STORAGE_KEY);
  return stored !== null ? stored === "on" : enabledInMemory;
}

function writeEnabled(enabled: boolean) {
  enabledInMemory = enabled;
  writeStorage(STORAGE_KEY, enabled ? "on" : "off");
}

function readVolume() {
  return volumeFromStorage(readStorage(VOLUME_STORAGE_KEY), volumeInMemory);
}

function writeVolume(percent: number) {
  volumeInMemory = clampVolume(percent);
  writeStorage(VOLUME_STORAGE_KEY, String(volumeInMemory));
}

function readPreset() {
  const stored = readStorage(PRESET_STORAGE_KEY);
  return stored !== null ? presetFromStorage(stored) : presetInMemory;
}

function writePreset(id: AlertPresetId) {
  presetInMemory = id;
  writeStorage(PRESET_STORAGE_KEY, id);
}

function readRepeat() {
  const stored = readStorage(REPEAT_STORAGE_KEY);
  return stored !== null ? repeatFromStorage(stored) : repeatInMemory;
}

function writeRepeat(choice: AlertRepeat) {
  repeatInMemory = choice;
  writeStorage(REPEAT_STORAGE_KEY, serializeRepeat(choice));
}

/** Squared, because loudness is perceived roughly logarithmically — a
 *  linear map would make the bottom half of the slider barely differ
 *  from the top. 50% → 0.25, 80% → 0.64, 100% → 1.0 (full scale). */
function peakGainFor(volume: number) {
  return (volume / 100) ** 2;
}

/** One alert: every note of the preset, each partial its own oscillator
 *  (noteVoices — the level split across partials). The envelope is the
 *  original beep's: from 0.0001, a LINEAR rise to the level in 0.01s, an
 *  EXPONENTIAL fall to 0.0001 at the note's end, the oscillator stopped
 *  0.01s after — so it never clicks at either end. */
function playPreset(
  context: AudioContext,
  preset: AlertPreset,
  volume: number,
) {
  const startAt = context.currentTime;
  for (const note of preset.notes) {
    for (const voice of noteVoices(note, peakGainFor(volume))) {
      const start = startAt + voice.start;
      const end = startAt + voice.end;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = voice.wave;
      oscillator.frequency.value = voice.frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(voice.level, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.01);
    }
  }
}

export function useOrderAlertSound() {
  // Server render and hydration always see "off" — the stored value
  // only shows up after mount, so the markup matches.
  const enabled = useStoredValue(readEnabled, false);
  const volume = useStoredValue(readVolume, DEFAULT_VOLUME);
  const preset = useStoredValue(readPreset, DEFAULT_ALERT_PRESET);
  const repeat = useStoredValue<AlertRepeat>(readRepeat, ALERT_REPEAT_SECONDS);
  const contextRef = useRef<AudioContext | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const ensureContext = useCallback(() => {
    if (!contextRef.current) {
      const context = new AudioContext();
      // The browser can suspend it again later (or it may never have
      // started) — keep isRunning honest either way.
      context.addEventListener("statechange", () => {
        // Ignore a released context's late event (e.g. the one closed
        // by a StrictMode remount) so it can't clobber the new one.
        if (contextRef.current === context) {
          setIsRunning(context.state === "running");
        }
      });
      contextRef.current = context;
    }
    return contextRef.current;
  }, []);

  /** Creates the context if needed and awaits resume(). Returns the
   *  context only if it is actually running now (a resume outside a
   *  user gesture can be refused), otherwise null. */
  const resumeContext = useCallback(async () => {
    try {
      const context = ensureContext();
      await context.resume();
      setIsRunning(context.state === "running");
      return context.state === "running" ? context : null;
    } catch {
      // Web Audio unavailable/blocked — the alert is simply skipped.
      setIsRunning(false);
      return null;
    }
  }, [ensureContext]);

  // Preference restored as "on": try to start audio right away (works
  // when the page already had a user gesture, e.g. after SPA
  // navigation; a fresh reload gets refused and stays locked).
  useEffect(() => {
    if (enabled) void resumeContext();
  }, [enabled, resumeContext]);

  // Still locked with the preference "on": a tap/keypress anywhere
  // unlocks it. The listeners stay until the audio really runs (isLocked
  // going false removes them) — a gesture the browser refuses must not be
  // the last try. Capture, so nothing on the page can stop them.
  const isLocked = enabled && !isRunning;
  useEffect(() => {
    if (!isLocked) return;
    function onGesture() {
      void resumeContext();
    }
    UNLOCK_GESTURES.forEach((name) =>
      window.addEventListener(name, onGesture, true),
    );
    return () =>
      UNLOCK_GESTURES.forEach((name) =>
        window.removeEventListener(name, onGesture, true),
      );
  }, [isLocked, resumeContext]);

  // Release the AudioContext when the Backoffice layout unmounts.
  // (contextRef is assigned in ensureContext, so this isn't the
  // DOM-ref-in-cleanup pattern the lint rule is guarding against.)
  useEffect(() => {
    return () => {
      const context = contextRef.current;
      contextRef.current = null;
      void context?.close();
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !readEnabled();
    writeEnabled(next);
    if (!next) return;
    // Turning ON is the user gesture: unlock, then one test alert.
    void resumeContext().then((context) => {
      if (context) playPreset(context, alertPreset(readPreset()), readVolume());
    });
  }, [resumeContext]);

  const setVolume = useCallback((percent: number) => {
    writeVolume(percent);
  }, []);

  /** One alert in the chosen sound at the current volume — for the
   *  volume slider, called on
   *  release (a user gesture, so resume() is allowed). Silent while the
   *  sound is off. */
  const playTest = useCallback(() => {
    if (!readEnabled()) return;
    void resumeContext().then((context) => {
      if (context) playPreset(context, alertPreset(readPreset()), readVolume());
    });
  }, [resumeContext]);

  /** One alert in the device's chosen sound. OrderAlertsProvider's
   *  repeat timer decides when (lib/hooks/orderAlertRepeat). Silent
   *  (never throws) if audio isn't unlocked. */
  const play = useCallback(async () => {
    if (!readEnabled()) return;
    const context = await resumeContext();
    if (!context) return;
    try {
      playPreset(context, alertPreset(readPreset()), readVolume());
    } catch {
      // never let a sound failure break the list
    }
  }, [resumeContext]);

  /** Plays one preset once — the Alert settings' ▶ buttons, and picking
   *  a sound. A user gesture, so it also unlocks audio after a reload.
   *  Silent while the sound is off. */
  const preview = useCallback(
    (id: AlertPresetId) => {
      if (!readEnabled()) return;
      void resumeContext().then((context) => {
        if (context) playPreset(context, alertPreset(id), readVolume());
      });
    },
    [resumeContext],
  );

  /** Picks the device's sound and plays it once. */
  const setPreset = useCallback(
    (id: AlertPresetId) => {
      writePreset(id);
      preview(id);
    },
    [preview],
  );

  const setRepeat = useCallback((choice: AlertRepeat) => {
    writeRepeat(choice);
  }, []);

  return {
    enabled,
    isLocked,
    toggle,
    play,
    volume,
    setVolume,
    playTest,
    preset,
    setPreset,
    preview,
    repeat,
    setRepeat,
  };
}
