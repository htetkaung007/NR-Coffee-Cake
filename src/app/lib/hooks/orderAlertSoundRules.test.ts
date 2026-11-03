import { describe, it, expect } from "vitest";
import {
  ALERT_REPEAT_CHOICES,
  ALERT_REPEAT_SECONDS,
  DEFAULT_VOLUME,
  UNLOCK_GESTURES,
  repeatFromStorage,
  serializeRepeat,
  volumeFromStorage,
} from "./orderAlertSoundRules";

describe("volumeFromStorage", () => {
  it("defaults to 80% on first use", () => {
    expect(DEFAULT_VOLUME).toBe(80);
    expect(volumeFromStorage(null, DEFAULT_VOLUME)).toBe(80);
  });

  it("keeps a volume the owner already saved", () => {
    expect(volumeFromStorage("50", DEFAULT_VOLUME)).toBe(50);
  });

  it("clamps a saved value into the slider's range", () => {
    expect(volumeFromStorage("5", DEFAULT_VOLUME)).toBe(10);
    expect(volumeFromStorage("500", DEFAULT_VOLUME)).toBe(100);
  });

  it("ignores a saved value that isn't a number", () => {
    expect(volumeFromStorage("loud", 70)).toBe(70);
  });
});

describe("ALERT_REPEAT_CHOICES", () => {
  it("offers Once, 3s, 5s, 10s and 30s", () => {
    expect(ALERT_REPEAT_CHOICES).toEqual(["once", 3, 5, 10, 30]);
  });

  it("includes the 5s default", () => {
    expect(ALERT_REPEAT_CHOICES).toContain(ALERT_REPEAT_SECONDS);
  });
});

describe("repeatFromStorage", () => {
  it("defaults to every 5 seconds when nothing is saved", () => {
    expect(repeatFromStorage(null)).toBe(5);
  });

  it("reads back every choice", () => {
    for (const choice of ALERT_REPEAT_CHOICES) {
      expect(repeatFromStorage(serializeRepeat(choice))).toBe(choice);
    }
  });

  it("falls back to 5 seconds for an unknown or broken value", () => {
    for (const stored of ["7", "", "never", "5.5", "-3", "{}"]) {
      expect(repeatFromStorage(stored)).toBe(5);
    }
  });
});

describe("UNLOCK_GESTURES", () => {
  it("uses events that grant user activation on touch screens", () => {
    expect(UNLOCK_GESTURES).toEqual(
      expect.arrayContaining(["pointerup", "touchend", "click", "keydown"]),
    );
  });

  it("never relies on pointerdown, which a touch doesn't activate", () => {
    expect(UNLOCK_GESTURES).not.toContain("pointerdown");
  });
});
