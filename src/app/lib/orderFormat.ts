/** Display formatting shared across the app — customer order flow,
 *  Backoffice and the printable bill. */

/** The ONE place the currency label lives. Every money string goes
 *  through formatAmount/formatMoneyDelta below; the few spots that need
 *  the bare label (a price input's adornment, a validation message)
 *  import this instead of writing it out. */
export const CURRENCY_LABEL = "MMK";

/** { value: "4,570", currency: "MMK" } — an amount's two parts, for a
 *  place that styles them apart (a big number, a small currency). The
 *  ONE place an amount is formatted; formatAmount joins the parts. */
export function formatAmountParts(amount: number) {
  return { value: amount.toLocaleString(), currency: CURRENCY_LABEL };
}

/** "1,234 MMK" — every price and total on screen and on paper. */
export function formatAmount(amount: number) {
  const { value, currency } = formatAmountParts(amount);
  return `${value} ${currency}`;
}

/** "999", "24.4k", "1.3M" — an amount in a tight spot (a chart's axis or
 *  a bar's label), no currency: the chart's caption names it. One
 *  decimal at most, a trailing ".0" dropped, and anything that would
 *  round to "1000k" is written as "1M". */
export function formatCompactAmount(amount: number): string {
  const size = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const oneDecimal = (n: number) => String(Number(n.toFixed(1)));
  if (size >= 999_950) return `${sign}${oneDecimal(size / 1_000_000)}M`;
  if (size >= 1_000) return `${sign}${oneDecimal(size / 1_000)}k`;
  return `${sign}${Math.round(size)}`;
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
