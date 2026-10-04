/** An ordinary click on a link — left button, no modifier held. Anything
 *  else (middle click, ⌘/Ctrl-click, Shift-click) means "open it
 *  somewhere else", so a link that handles its own navigation must leave
 *  those to the browser. */
export function isPlainLeftClick(event: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
