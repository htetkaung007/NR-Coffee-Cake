/**
 * One unpaid bill per phone at a location (Table ↔ Counter). A browser
 * that already has an UNPAID order place at a location must not start a
 * second one there: scanning the Counter QR while it holds a current
 * Table token for a table at that location sends it back to that table;
 * scanning a Table QR while its Counter cookie points to an open bill
 * there sends it back to the counter. Paid / stale / another location →
 * as before. Per browser (its cookies) — another phone is another
 * customer. Pure: the QR Route Handlers gather the facts on the server
 * and call this; the redirect carries only a short notice flag.
 */

export interface OpenPlaceFacts {
  scan: "counter" | "table";
  /** A table at THIS location this browser holds a CURRENT contributor
   *  token for (stale once that table is paid) — its id; else null. */
  openTableIdHere: number | null;
  /** This browser's Counter cookie points to a bill at THIS location
   *  that isn't paid / locked. */
  hasOpenCounterBillHere: boolean;
}

export type OpenPlaceDecision =
  | { kind: "proceed" }
  | { kind: "toTable"; tableId: number }
  | { kind: "toCounter" };

export function openOrderPlace(facts: OpenPlaceFacts): OpenPlaceDecision {
  if (facts.scan === "counter" && facts.openTableIdHere !== null) {
    return { kind: "toTable", tableId: facts.openTableIdHere };
  }
  if (facts.scan === "table" && facts.hasOpenCounterBillHere) {
    return { kind: "toCounter" };
  }
  return { kind: "proceed" };
}

/** The `notice` flag's values on /menu — words only, never ids. */
const OPEN_PLACE_NOTICES = ["atTable", "atCounter"] as const;
export type OpenPlaceNotice = (typeof OPEN_PLACE_NOTICES)[number];

/** The URL flag as a notice — anything else (untrusted) is none. */
export function parseOpenPlaceNotice(
  raw: string | null | undefined,
): OpenPlaceNotice | null {
  return (OPEN_PLACE_NOTICES as readonly string[]).includes(raw ?? "")
    ? (raw as OpenPlaceNotice)
    : null;
}

/** Where a redirecting decision sends the browser — the menu of the
 *  place it already has, with the notice flag. */
export function openPlaceMenuQuery(
  decision: Exclude<OpenPlaceDecision, { kind: "proceed" }>,
  locationId: number,
): Record<string, string | number> {
  return decision.kind === "toTable"
    ? { locationId, tableId: decision.tableId, notice: "atTable" }
    : { locationId, notice: "atCounter" };
}
