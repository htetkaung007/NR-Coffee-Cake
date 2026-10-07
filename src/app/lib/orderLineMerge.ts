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
 * (groupDraftsForSubmit) merges each customer's own drafts with it,
 * Counter's Add to cart (OrderSessionCartService.addItemToCart) merges
 * into an existing cart line with it, and the Backoffice merges a
 * round's lines for display with it (mergeLinesForDisplay).
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

/** A Table draft as Send to Kitchen reads it: whose pick, and the line
 *  with its own price snapshots. */
export interface SubmitDraft {
  contributorToken: string | null;
  menuId: number;
  menuName: string;
  quantity: number;
  unitPrice: number;
  addons: readonly PricedAddon[];
  note: string | null;
}

/** One submitted Order row: the same customer's identical picks merged. */
export interface SubmitLine {
  contributorToken: string | null;
  menuId: number;
  quantity: number;
  unitPrice: number;
  addons: PricedAddon[];
  note: string | null;
}

/**
 * Send to Kitchen's grouping (TableDraftService.submitDraft), pure:
 *
 * - `lines` — one row per CUSTOMER per line: a customer's identical
 *   picks (lineMergeKey) merge into one row with the quantities added,
 *   but two customers' identical picks stay two rows, each keeping its
 *   contributorToken — so each person still sees their own lines after
 *   Send. A merged row keeps its first draft's note (normalized) and its
 *   add-ons sorted by id.
 * - `stockByMenu` — what to take from stock: everyone's quantities
 *   combined per menu (in first-seen order), so a shortage names the
 *   menu, not one person's line.
 */
export function groupDraftsForSubmit(drafts: readonly SubmitDraft[]): {
  lines: SubmitLine[];
  stockByMenu: { menuId: number; menuName: string; quantity: number }[];
} {
  const lines = new Map<string, SubmitLine>();
  const stock = new Map<number, { menuId: number; menuName: string; quantity: number }>();

  for (const item of drafts) {
    const addons = [...item.addons].sort((a, b) => a.addonId - b.addonId);
    const key = JSON.stringify([
      item.contributorToken,
      lineMergeKey(item.menuId, item.unitPrice, addons, item.note),
    ]);
    const line = lines.get(key);
    if (line) {
      line.quantity += item.quantity;
    } else {
      lines.set(key, {
        contributorToken: item.contributorToken,
        menuId: item.menuId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        addons,
        note: normalizeOrderNote(item.note),
      });
    }

    const menu = stock.get(item.menuId);
    if (menu) menu.quantity += item.quantity;
    else stock.set(item.menuId, { menuId: item.menuId, menuName: item.menuName, quantity: item.quantity });
  }

  return { lines: [...lines.values()], stockByMenu: [...stock.values()] };
}

/** A submitted Order row as the Backoffice merges it for display. */
interface DisplayMergeable {
  id: number;
  menuId: number;
  quantity: number;
  unitPrice: number;
  note: string | null;
  OrdersAddons: readonly PricedAddon[];
  contributorToken?: string | null;
}

/**
 * A round's lines as the Backoffice SHOWS them: Table QR keeps one row
 * per customer per line (groupDraftsForSubmit), so identical lines from
 * different customers are merged here — for display only — into one,
 * the quantities added ("Iced Latte ×2"). Same rule as everywhere else
 * (lineMergeKey): lines with a different note, add-on set or price
 * snapshot stay separate. A merged line keeps its first line's id (the
 * React key), add-ons and note; lines stay in order of first appearance,
 * and the total is unchanged (each part is the same per-unit price).
 * The contributorToken is dropped — the Backoffice never shows who. Pure:
 * the rows given aren't changed.
 */
export function mergeLinesForDisplay<Line extends DisplayMergeable>(
  lines: readonly Line[],
): Omit<Line, "contributorToken">[] {
  const merged = new Map<string, Omit<Line, "contributorToken">>();
  for (const { contributorToken: _owner, ...line } of lines) {
    void _owner;
    const key = lineMergeKey(line.menuId, line.unitPrice, line.OrdersAddons, line.note);
    const existing = merged.get(key);
    if (existing) existing.quantity += line.quantity;
    else merged.set(key, { ...line });
  }
  return [...merged.values()];
}
