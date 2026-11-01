import { describe, it, expect } from "vitest";
import {
  BEEP_COUNT,
  DEFAULT_VOLUME,
  UNLOCK_GESTURES,
  beepStartOffsets,
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

describe("beepStartOffsets", () => {
  it("plays three beeps", () => {
    expect(BEEP_COUNT).toBe(3);
    expect(beepStartOffsets()).toHaveLength(3);
  });

  it("starts at once and never overlaps a beep with the next", () => {
    const offsets = beepStartOffsets();
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBeGreaterThan(0.15);
    expect(offsets[2] - offsets[1]).toBeCloseTo(offsets[1] - offsets[0]);
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
