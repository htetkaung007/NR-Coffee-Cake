import { describe, it, expect } from "vitest";
import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";
import {
  ALERT_PRESETS,
  DEFAULT_ALERT_PRESET,
  alertPreset,
  noteVoices,
  presetDuration,
  presetFromStorage,
} from "./orderAlertPresets";

describe("ALERT_PRESETS", () => {
  it("offers the five approved sounds, Classic first", () => {
    expect(ALERT_PRESETS.map((preset) => preset.id)).toEqual([
      "classic",
      "chime",
      "highAlert",
      "softBell",
      "rising",
    ]);
  });

  it("has unique ids", () => {
    const ids = ALERT_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names every sound in both languages", () => {
    for (const { id } of ALERT_PRESETS) {
      expect(en.bo.alerts.presets[id]).toBeTruthy();
      expect(my.bo.alerts.presets[id]).toBeTruthy();
    }
  });

  it("never lasts longer than 1.5 seconds", () => {
    for (const preset of ALERT_PRESETS) {
      expect(presetDuration(preset)).toBeLessThanOrEqual(1.5);
    }
  });

  it("keeps every note's gain in (0, 1]", () => {
    for (const preset of ALERT_PRESETS) {
      for (const note of preset.notes) {
        expect(note.gain).toBeGreaterThan(0);
        expect(note.gain).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("classic", () => {
  it("is the default", () => {
    expect(DEFAULT_ALERT_PRESET).toBe("classic");
  });

  it("is today's three beeps: 880 Hz sine at 0, 0.25 and 0.5s, 0.15s each", () => {
    const { notes } = alertPreset("classic");
    expect(notes).toHaveLength(3);
    expect(notes.map((note) => note.start)).toEqual([0, 0.25, 0.5]);
    for (const note of notes) {
      expect(note).toMatchObject({
        hz: 880,
        wave: "sine",
        length: 0.15,
        gain: 1,
      });
      expect(note.partials).toBeUndefined();
    }
  });
});

describe("presetFromStorage", () => {
  it("defaults to classic when nothing is saved", () => {
    expect(presetFromStorage(null)).toBe("classic");
  });

  it("reads back a saved sound", () => {
    expect(presetFromStorage("softBell")).toBe("softBell");
  });

  it("falls back to classic for an unknown or broken value", () => {
    for (const stored of ["", "siren", "CHIME", "{}", "toString"]) {
      expect(presetFromStorage(stored)).toBe("classic");
    }
  });
});

describe("noteVoices", () => {
  it("plays a note without partials as one tone at its own pitch and level", () => {
    const voices = noteVoices(
      { hz: 880, wave: "sine", start: 0.25, length: 0.15, gain: 0.5 },
      0.64,
    );
    expect(voices).toEqual([
      { frequency: 880, wave: "sine", level: 0.32, start: 0.25, end: 0.4 },
    ]);
  });

  it("plays each partial at hz × ratio", () => {
    const voices = noteVoices(
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
      1,
    );
    expect(voices.map((voice) => voice.frequency)).toEqual([
      784,
      784 * 2.76,
      784 * 5.4,
    ]);
  });

  it("splits the note's level across its partials, so a bell is never louder than a plain note", () => {
    const note = {
      hz: 1318.5,
      wave: "sine" as const,
      start: 0,
      length: 0.7,
      gain: 1,
      partials: [
        [1, 1],
        [2, 0.3],
        [3, 0.12],
      ] as [number, number][],
    };
    const voices = noteVoices(note, 0.64);
    const total = voices.reduce((sum, voice) => sum + voice.level, 0);
    expect(total).toBeCloseTo(0.64);
    expect(voices[1].level / voices[0].level).toBeCloseTo(0.3);
  });
});
