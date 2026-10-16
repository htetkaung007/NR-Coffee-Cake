/**
 * Is the phone's on-screen keyboard (probably) open? Decides when the
 * customer bottom bar steps aside (useOnScreenKeyboardOpen). Pure and
 * client-safe.
 *
 * Focus is the signal: a text field getting focus opens the keyboard,
 * losing it closes it. The visual viewport only CONFIRMS: once it was
 * seen shrinking (the keyboard is up) and then growing back while the
 * field still has focus — Android's Back hides the keyboard without a
 * blur — the keyboard is gone. Without a viewport signal (no
 * visualViewport, or a browser that resizes the page instead) focus
 * alone decides.
 */

export type KeyboardPhase =
  /** No text field has focus. */
  | "none"
  /** A text field has focus; the keyboard is opening. */
  | "focused"
  /** The viewport shrank: the keyboard is up. */
  | "open"
  /** It grew back while the field kept focus: the keyboard was closed. */
  | "dismissed";

export type KeyboardEvent =
  | { type: "focus"; textEntry: boolean }
  | { type: "viewport"; shrunk: boolean };

export function nextKeyboardPhase(
  phase: KeyboardPhase,
  event: KeyboardEvent,
): KeyboardPhase {
  if (event.type === "focus") {
    if (!event.textEntry) return "none";
    // Moving between fields: the keyboard stays up.
    return phase === "open" ? "open" : "focused";
  }
  if (event.shrunk) return phase === "none" ? "none" : "open";
  return phase === "open" ? "dismissed" : phase;
}

/** While the bar should be out of the way. */
export function isKeyboardOpen(phase: KeyboardPhase): boolean {
  return phase === "focused" || phase === "open";
}

/** The keyboard takes at least this much height; less (the browser's
 *  own toolbars moving) is not it. */
const KEYBOARD_MIN_HEIGHT_PX = 150;

/** Whether the visible area is short of the window by a keyboard's
 *  height. `viewportHeight * scale` undoes a pinch zoom. */
export function isViewportShrunk(
  windowHeight: number,
  viewportHeight: number,
  scale: number,
): boolean {
  return windowHeight - viewportHeight * scale > KEYBOARD_MIN_HEIGHT_PX;
}

/** What a focused element is, as far as the keyboard goes. */
export interface FocusTarget {
  tagName: string;
  type?: string;
  isContentEditable?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
}

/** Input types that type text — the rest (checkbox, radio, range,
 *  button, file, color, date pickers…) bring no keyboard. */
const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "tel",
  "url",
  "number",
  "password",
]);

/** Whether focusing `target` brings up the on-screen keyboard: a text
 *  input, a textarea or anything contenteditable — not read-only or
 *  disabled. */
export function isTextEntry(target: FocusTarget | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  if (target.readOnly || target.disabled) return false;
  const tag = target.tagName.toUpperCase();
  if (tag === "TEXTAREA") return true;
  if (tag !== "INPUT") return false;
  return TEXT_INPUT_TYPES.has((target.type || "text").toLowerCase());
}
