/**
 * The Order List's text emphasis — the source of truth the Order History
 * page matches, so /backoffice/order and /backoffice/order/history read
 * as two tabs of one page. Each pairs with `<Typography variant="body1">`
 * (the weights sit on top of body1's own 600). Named once here instead of
 * repeated per file so the two pages can't drift apart.
 */

/** Section headings ("Tables (3)", "Needs approval (1)") and the History
 *  detail panel's title. */
export const sectionHeadingSx = { fontWeight: 800 } as const;

/** Card / row titles ("Table 1", "#A060"). */
export const entryTitleSx = { fontWeight: 700 } as const;

/** Money on cards and rows (text from formatAmount). */
export const moneySx = { fontWeight: 800 } as const;

/** Which colour an amount takes: "neutral" (text.primary — the default
 *  everywhere) or "income" (money received, on Reports: the success
 *  role's text shade, palette.successText). Never red (DESIGN.md
 *  Rule 13). */
export type MoneyTone = "neutral" | "income";

/** moneySx plus the tone's colour — the one place a money colour is
 *  chosen, so callers never write one out. */
export function moneyColor(tone: MoneyTone = "neutral") {
  return tone === "income" ? "successText" : "text.primary";
}

/** Money on cards and rows (moneySx) in the tone's colour. */
export function moneyToneSx(tone: MoneyTone = "neutral") {
  return { ...moneySx, color: moneyColor(tone) } as const;
}
