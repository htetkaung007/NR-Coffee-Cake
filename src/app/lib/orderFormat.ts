/** Display formatting shared across the app — customer order flow,
 *  Backoffice and the printable bill. */

/** The ONE place the currency label lives. Every money string goes
 *  through formatAmount/formatMoneyDelta below; the few spots that need
 *  the bare label (a price input's adornment, a validation message)
 *  import this instead of writing it out. */
export const CURRENCY_LABEL = "MMK";

/** "1,234 MMK" — every price and total on screen and on paper. */
export function formatAmount(amount: number) {
  return `${amount.toLocaleString()} ${CURRENCY_LABEL}`;
}

/** "+500 MMK" — an add-on's extra charge, or an amount still to be
 *  added on top of a bill. */
export function formatMoneyDelta(amount: number) {
  return `+${formatAmount(amount)}`;
}

/** "11:35 AM" in the viewer's locale. The server's render can differ
 *  from the browser's, so the element showing it needs
 *  suppressHydrationWarning. */
export function formatClockTime(isoTime: string) {
  return new Date(isoTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "1 order" / "3 orders". */
export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
