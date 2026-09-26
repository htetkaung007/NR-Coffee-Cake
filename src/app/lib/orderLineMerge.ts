import { normalizeOrderNote } from "./orderNote";

/** A note in the form used ONLY to compare two notes — never stored.
 *  Starts from normalizeOrderNote (trimmed, blank → null), then
 *  Unicode-normalizes (NFC, so the same visible text typed on two
 *  keyboards compares equal), collapses runs of whitespace to one space
 *  and lowercases. Nothing fuzzier: notes that differ in actual
 *  characters ("less sugar" vs "no sugar") must stay apart, since a
 *  wrong merge would silently drop a customer's instruction. */
function noteForComparison(note: string | null | undefined) {
  const normalized = normalizeOrderNote(note);
  if (normalized === null) return null;
  return normalized.normalize("NFC").replace(/\s+/g, " ").toLowerCase();
}

/** An add-on link as the merge rule needs it — its own snapshot price,
 *  not just its id (see PriceSnapshotService/Order.unitPrice). */
export interface PricedAddon {
  addonId: number;
  unitPrice: number;
}

/**
 * When two order lines are "the same line" and should be one line with
 * the quantities added: same menu AT THE SAME PRICE, same set of
 * add-ons at the same prices too (duplicates and selection order don't
 * matter) and the same note as far as noteForComparison can tell.
 * Returns a string key — equal keys, same line.
 *
 * unitPrice is part of the key on purpose: if the menu's price changed
 * between two adds of "the same" item, they must stay separate lines,
 * each charged at its own snapshot price (see Order.unitPrice's own
 * schema comment) — never silently merged into one line at whichever
 * price happened to be current.
 *
 * The one place this rule lives: Table QR's Send to Kitchen
 * (TableDraftService.submitDraft) merges a table's drafts with it, and
 * Counter's Add to cart (OrderSessionCartService.addItemToCart) merges
 * into an existing cart line with it.
 */
export function lineMergeKey(
  menuId: number,
  unitPrice: number,
  addons: readonly PricedAddon[],
  note: string | null | undefined,
) {
  const addonSet = [...new Map(addons.map((a) => [a.addonId, a.unitPrice]))]
    .sort(([a], [b]) => a - b);
  // JSON keeps the parts unambiguous whatever a note contains.
  return JSON.stringify([menuId, unitPrice, addonSet, noteForComparison(note)]);
}
