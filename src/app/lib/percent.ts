/** `part` as a percent of `whole`, rounded (half up) to `decimals` places —
 *  the one place the reports' percentages are rounded: shares, rates,
 *  channel splits and period-on-period changes. 0 when the whole is 0
 *  (nothing to be a share of), and never -0, so a change too small to
 *  show reads as plain 0. */
export function percentOf(part: number, whole: number, decimals = 0): number {
  if (whole === 0) return 0;
  const factor = 10 ** decimals;
  const rounded = Math.round((part / whole) * 100 * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}
