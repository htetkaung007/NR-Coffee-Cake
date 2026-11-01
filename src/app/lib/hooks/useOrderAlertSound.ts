"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BEEP_SECONDS,
  DEFAULT_VOLUME,
  UNLOCK_GESTURES,
  beepStartOffsets,
  clampVolume,
  volumeFromStorage,
} from "./orderAlertSoundRules";
import { readStorage, useStoredValue, writeStorage } from "./useStoredValue";

/**
 * Optional beep when a round newly needs approval, on any Backoffice
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
 *    context and plays one test beep straight away (instant proof it
 *    works);
 *  - an "on" preference restored after a reload shows `isLocked`
 *    (callers render a "Tap anywhere to enable sound" hint) and a
 *    gesture anywhere (UNLOCK_GESTURES) unlocks it — every one tries
 *    again until the audio is really running;
 *  - play() always awaits resume() before making sound.
 * An alert is three short beeps. Volume (10–100%, default 80) is remembered the same way, under its
 * own key.
 * Called only from OrderAlertsProvider (mounted in the Backoffice
 * layout), so there's one AudioContext, held in a ref, for the whole
 * Backoffice session.
 */

const STORAGE_KEY = "orders-alert-sound";
const VOLUME_STORAGE_KEY = "orders-alert-volume";
let enabledInMemory = false;
let volumeInMemory = DEFAULT_VOLUME;

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

/** Squared, because loudness is perceived roughly logarithmically — a
 *  linear map would make the bottom half of the slider barely differ
 *  from the top. 50% → 0.25, 80% → 0.64, 100% → 1.0 (full scale). */
function peakGainFor(volume: number) {
  return (volume / 100) ** 2;
}

function playBeep(context: AudioContext, volume: number) {
  for (const offset of beepStartOffsets()) {
    playTone(context, volume, context.currentTime + offset);
  }
}

function playTone(context: AudioContext, volume: number, start: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  // Quick attack and decay so the tone doesn't click at either end.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peakGainFor(volume), start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + BEEP_SECONDS);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + BEEP_SECONDS + 0.01);
}

export function useOrderAlertSound() {
  // Server render and hydration always see "off" — the stored value
  // only shows up after mount, so the markup matches.
  const enabled = useStoredValue(readEnabled, false);
  const volume = useStoredValue(readVolume, DEFAULT_VOLUME);
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
      // Web Audio unavailable/blocked — the beep is simply skipped.
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
    // Turning ON is the user gesture: unlock, then one test beep.
    void resumeContext().then((context) => {
      if (context) playBeep(context, readVolume());
    });
  }, [resumeContext]);

  const setVolume = useCallback((percent: number) => {
    writeVolume(percent);
  }, []);

  /** One beep at the current volume — for the volume slider, called on
   *  release (a user gesture, so resume() is allowed). Silent while the
   *  sound is off. */
  const playTest = useCallback(() => {
    if (!readEnabled()) return;
    void resumeContext().then((context) => {
      if (context) playBeep(context, readVolume());
    });
  }, [resumeContext]);

  /** One beep. Callers invoke it once per refresh, however many new
   *  rounds arrived. Silent (never throws) if audio isn't unlocked. */
  const play = useCallback(async () => {
    if (!readEnabled()) return;
    const context = await resumeContext();
    if (!context) return;
    try {
      playBeep(context, readVolume());
    } catch {
      // never let a sound failure break the list
    }
  }, [resumeContext]);

  return { enabled, isLocked, toggle, play, volume, setVolume, playTest };
}
