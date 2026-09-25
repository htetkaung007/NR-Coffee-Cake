"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * Optional beep for the Backoffice Order List when a round newly needs
 * approval. OFF by default; the choice is remembered in localStorage
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
 *    (callers render a "Tap anywhere to enable sound" hint) and the
 *    first pointerdown/keydown anywhere unlocks it;
 *  - play() always awaits resume() before making sound.
 * One AudioContext per page, held in a ref.
 */

const STORAGE_KEY = "orders-alert-sound";
const CHANGE_EVENT = "orders-alert-sound-change";
const BEEP_SECONDS = 0.15;

let enabledInMemory = false;

function readEnabled() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "on";
  } catch {
    // storage blocked — fall through to the in-memory copy
  }
  return enabledInMemory;
}

function writeEnabled(enabled: boolean) {
  enabledInMemory = enabled;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // storage blocked — the in-memory copy still covers this session
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function playBeep(context: AudioContext) {
  const start = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  // Quick attack and decay so the tone doesn't click at either end;
  // 0.15 peak is clearly audible without being harsh.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + BEEP_SECONDS);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + BEEP_SECONDS + 0.01);
}

export function useOrderAlertSound() {
  // Server render and hydration always see "off" — the stored value
  // only shows up after mount, so the markup matches.
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => false);
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

  // Still locked with the preference "on": the first tap/keypress
  // anywhere unlocks it. One-time; removed once it fires and on unmount.
  const isLocked = enabled && !isRunning;
  useEffect(() => {
    if (!isLocked) return;
    const gestures = ["pointerdown", "keydown"] as const;
    function onGesture() {
      gestures.forEach((name) => window.removeEventListener(name, onGesture));
      void resumeContext();
    }
    gestures.forEach((name) => window.addEventListener(name, onGesture));
    return () =>
      gestures.forEach((name) => window.removeEventListener(name, onGesture));
  }, [isLocked, resumeContext]);

  // One AudioContext per page — release it when the page goes away.
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
      if (context) playBeep(context);
    });
  }, [resumeContext]);

  /** One beep. Callers invoke it once per refresh, however many new
   *  rounds arrived. Silent (never throws) if audio isn't unlocked. */
  const play = useCallback(async () => {
    if (!readEnabled()) return;
    const context = await resumeContext();
    if (!context) return;
    try {
      playBeep(context);
    } catch {
      // never let a sound failure break the list
    }
  }, [resumeContext]);

  return { enabled, isLocked, toggle, play };
}
