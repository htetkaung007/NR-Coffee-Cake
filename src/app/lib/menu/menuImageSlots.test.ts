import { describe, it, expect } from "vitest";
import { parseImageSlot, toImageSlots } from "./menuImageSlots";

describe("parseImageSlot", () => {
  it("reads a kept photo and a new file", () => {
    expect(parseImageSlot("keep:41")).toEqual({ kind: "keep", imageId: 41 });
    expect(parseImageSlot("new:0")).toEqual({ kind: "new", fileIndex: 0 });
  });

  it("refuses anything else", () => {
    for (const value of [
      "keep:0",
      "keep:-1",
      "keep:4.5",
      "keep:",
      "new:-1",
      "new:x",
      "replace:1",
      "keep:41 ",
      "",
      null,
      41,
    ]) {
      expect(parseImageSlot(value)).toBeNull();
    }
  });
});

describe("toImageSlots", () => {
  it("lists the photos in order, new files numbered in the order they're sent", () => {
    const fileA = { name: "a" };
    const fileB = { name: "b" };
    expect(
      toImageSlots([
        { kind: "new", file: fileA },
        { kind: "keep", imageId: 41 },
        { kind: "new", file: fileB },
      ]),
    ).toEqual({ slots: ["new:0", "keep:41", "new:1"], files: [fileA, fileB] });
  });

  it("round-trips through parseImageSlot", () => {
    const { slots } = toImageSlots([
      { kind: "keep", imageId: 7 },
      { kind: "new", file: {} },
    ]);
    expect(slots.map(parseImageSlot)).toEqual([
      { kind: "keep", imageId: 7 },
      { kind: "new", fileIndex: 0 },
    ]);
  });

  it("is empty for no photos", () => {
    expect(toImageSlots([])).toEqual({ slots: [], files: [] });
  });
});
