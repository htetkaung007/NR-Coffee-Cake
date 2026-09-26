/** Display formatting shared by the Backoffice order detail page and
 *  the printable bill. */

/** "1,234 MMK" — the same money format the Order List and the Mark-as-
 *  paid dialog use. */
export function formatAmount(amount: number) {
  return `${amount.toLocaleString()} MMK`;
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
