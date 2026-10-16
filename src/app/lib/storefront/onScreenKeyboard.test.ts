import { describe, it, expect } from "vitest";
import {
  isKeyboardOpen,
  isTextEntry,
  isViewportShrunk,
  nextKeyboardPhase,
  type KeyboardEvent,
  type KeyboardPhase,
} from "./onScreenKeyboard";

const run = (events: KeyboardEvent[], from: KeyboardPhase = "none") =>
  events.reduce(nextKeyboardPhase, from);

const focusText: KeyboardEvent = { type: "focus", textEntry: true };
const blur: KeyboardEvent = { type: "focus", textEntry: false };
const shrink: KeyboardEvent = { type: "viewport", shrunk: true };
const grow: KeyboardEvent = { type: "viewport", shrunk: false };

describe("nextKeyboardPhase", () => {
  it("counts the keyboard as open as soon as a text field gets focus", () => {
    expect(isKeyboardOpen(run([focusText]))).toBe(true);
  });

  it("stays open once the viewport shrinks", () => {
    expect(isKeyboardOpen(run([focusText, shrink]))).toBe(true);
  });

  it("closes on blur", () => {
    expect(isKeyboardOpen(run([focusText, shrink, blur]))).toBe(false);
  });

  it("closes when the keyboard is hidden while the field keeps focus (Android Back)", () => {
    expect(isKeyboardOpen(run([focusText, shrink, grow]))).toBe(false);
  });

  it("opens again when that field is tapped again", () => {
    expect(isKeyboardOpen(run([focusText, shrink, grow, shrink]))).toBe(true);
  });

  it("stays open when focus moves from one field to the next", () => {
    expect(isKeyboardOpen(run([focusText, shrink, focusText]))).toBe(true);
  });

  it("ignores a viewport change before it has seen it shrink", () => {
    expect(isKeyboardOpen(run([focusText, grow]))).toBe(true);
  });

  it("ignores viewport changes while no text field has focus", () => {
    expect(isKeyboardOpen(run([shrink]))).toBe(false);
  });
});

describe("isViewportShrunk", () => {
  it("is true when a keyboard's height is missing from the visible area", () => {
    expect(isViewportShrunk(800, 450, 1)).toBe(true);
  });

  it("is false for a small change (the browser's toolbars)", () => {
    expect(isViewportShrunk(800, 740, 1)).toBe(false);
  });

  it("is false while pinch-zoomed with no keyboard", () => {
    expect(isViewportShrunk(800, 400, 2)).toBe(false);
  });
});

describe("isTextEntry", () => {
  it("is true for text-like inputs and a textarea", () => {
    for (const type of ["text", "search", "email", "tel", "url", "number", "password"]) {
      expect(isTextEntry({ tagName: "INPUT", type })).toBe(true);
    }
    expect(isTextEntry({ tagName: "INPUT" })).toBe(true);
    expect(isTextEntry({ tagName: "TEXTAREA" })).toBe(true);
  });

  it("is true for contenteditable", () => {
    expect(isTextEntry({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("is false for inputs that bring no keyboard", () => {
    for (const type of ["checkbox", "radio", "range", "button", "file", "submit"]) {
      expect(isTextEntry({ tagName: "INPUT", type })).toBe(false);
    }
  });

  it("is false for read-only or disabled fields", () => {
    expect(isTextEntry({ tagName: "INPUT", type: "text", readOnly: true })).toBe(false);
    expect(isTextEntry({ tagName: "TEXTAREA", disabled: true })).toBe(false);
  });

  it("is false for buttons, links and nothing", () => {
    expect(isTextEntry({ tagName: "BUTTON" })).toBe(false);
    expect(isTextEntry({ tagName: "A" })).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});
