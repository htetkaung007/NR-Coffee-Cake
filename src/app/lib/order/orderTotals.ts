import { mergeLinesForDisplay } from "./orderLineMerge";
import { formatAddonSelections, localizeAddonSelections } from "./addonLabel";
import { effectiveQuantity } from "./voids";

/** An Order row with what its price depends on — see orderLineTotal.
 *  unitPrice/unitPrice below are each line's own PRICE SNAPSHOT (taken
 *  when the line was added), never Menu.price/Addon.price — a later
 *  price change must not alter an already-placed order's total. */
interface PricedOrderLine {
  quantity: number;
  unitPrice: number;
  OrdersAddons: { unitPrice: number }[];
  /** Units staff voided off it (OrderVoid). Required on purpose: every
   *  query that prices lines must load them, or tsc fails — a voided
   *  unit can never be charged by a caller that forgot. */
  voids: readonly { quantity: number }[];
}

/** THE line-total rule — the only place it lives. Every line amount
 *  anywhere (bill, receipt, customer/staff carts, the menu dialog's live
 *  preview) comes out of here, via orderLineTotal / cartLineTotal or
 *  directly.
 *
 *  Add-ons belong to ONE unit of the menu item, so the whole set is
 *  multiplied by quantity:
 *    lineTotal = (menu unitPrice + sum of the line's add-on unitPrices) × quantity
 *  e.g. Latte 2,000 + Extra shot 500, ×2 → 5,000 (not 4,500). */
export function lineTotal(
  unitPrice: number,
  addonUnitPrices: readonly number[],
  quantity: number,
) {
  const addonsPerUnit = addonUnitPrices.reduce((sum, price) => sum + price, 0);
  return (unitPrice + addonsPerUnit) * quantity;
}

/** What an Order row costs, from its own price snapshots (Order.unitPrice
 *  and each OrdersAddon.unitPrice), by the rule in lineTotal:
 *  (menu unitPrice + add-ons) × quantity — e.g. Latte 2,000 + Extra shot
 *  500, ×2 → 5,000. Add-ons used to be counted once per line (4,500),
 *  which under-charged every multi-quantity line with add-ons. Shared so
 *  the cashier list, the bill, the customer's receipt, the
 *  order-confirmed screen and history can't disagree. */
export function orderLineTotal(order: PricedOrderLine) {
  // Voided units are never charged (lib/order/voids).
  return lineTotal(
    order.unitPrice,
    order.OrdersAddons.map((link) => link.unitPrice),
    effectiveQuantity(order),
  );
}

/** A picked add-on on a client-side line, with its own price snapshot
 *  (OrdersAddon.unitPrice — see toLineAddons). */
export interface LineAddon {
  id: number;
  name: string;
  /** Its Myanmar name, for customer screens (null/absent: the English
   *  name shows — lib/i18n/localizedText). Never part of the price. */
  nameMy?: string | null;
  /** Its add-on group's names, for "Sweet: Low" (lib/order/addonLabel);
   *  absent → the option name alone. Read live, never a snapshot. */
  groupName?: string | null;
  groupNameMy?: string | null;
  unitPrice: number;
}

/** A client-side cart/draft line (CartLine, DraftLine, the staff cart)
 *  — the same snapshot prices as the Order row it came from, so it
 *  prices through the same formula as the bill. */
interface PricedCartLine {
  price: number;
  quantity: number;
  addons: readonly Pick<LineAddon, "unitPrice">[];
}

export function cartLineTotal(line: PricedCartLine) {
  return lineTotal(
    line.price,
    line.addons.map((addon) => addon.unitPrice),
    line.quantity,
  );
}

export function cartLinesTotal(lines: readonly PricedCartLine[]) {
  return lines.reduce((sum, line) => sum + cartLineTotal(line), 0);
}

export function orderLinesTotal(orders: PricedOrderLine[]) {
  return orders.reduce((sum, order) => sum + orderLineTotal(order), 0);
}

/** An Order row as the bill reads it: its price snapshot inputs plus
 *  names, and what mergeLinesForDisplay compares (menu, note, add-on
 *  ids). */
interface BillLine {
  id: number;
  menuId: number;
  quantity: number;
  unitPrice: number;
  note: string | null;
  menu: { name: string; nameMy?: string | null };
  OrdersAddons: {
    addonId: number;
    unitPrice: number;
    addon: {
      name: string;
      nameMy?: string | null;
      addonCategory?: { name: string; nameMy?: string | null } | null;
    };
  }[];
  voids: readonly { quantity: number }[];
}

/** One row of a bill line, item first then each add-on: its name, the
 *  line's quantity, and what it adds to the line (snapshot price ×
 *  quantity). The rows of a line ALWAYS add up to its lineTotal — the
 *  tests hold them to it. */
export interface BreakdownRow {
  kind: "item" | "addon";
  name: string;
  /** The same name in Myanmar where the shop gave one (localizedText per
   *  part: the menu, the add-on group and option) — set on bills built
   *  from stored lines (buildEntryBill), for a Myanmar staff screen or
   *  voucher. Display only. */
  nameMy?: string | null;
  quantity: number;
  amount: number;
}

/** A line as lineBreakdown reads it — names plus price snapshots. */
export interface BreakdownSource {
  name: string;
  quantity: number;
  unitPrice: number;
  addons: readonly {
    name: string;
    groupName?: string | null;
    unitPrice: number;
  }[];
}

/** A line itemised for a bill: "Latte ×2 4,000" then "+ Extra shot ×2
 *  1,000" — add-ons belong to ONE unit, so each is multiplied by the
 *  quantity too (lineTotal's rule, split into its parts). */
export function lineBreakdown(line: BreakdownSource): BreakdownRow[] {
  return [
    {
      kind: "item",
      name: line.name,
      quantity: line.quantity,
      amount: lineTotal(line.unitPrice, [], line.quantity),
    },
    ...line.addons.map((addon) => ({
      kind: "addon" as const,
      // "Sweet: Low" — the group tells apart options that share a name.
      name: formatAddonSelections([addon]),
      quantity: line.quantity,
      amount: lineTotal(addon.unitPrice, [], line.quantity),
    })),
  ];
}

/** A line's rows (lineBreakdown, item then add-ons in order) with each
 *  name's Myanmar rendering beside it (BreakdownRow.nameMy). */
function withMyanmarNames(rows: BreakdownRow[], line: BillLine): BreakdownRow[] {
  return rows.map((row, index) => {
    if (row.kind === "item") return { ...row, nameMy: line.menu.nameMy ?? null };
    const link = line.OrdersAddons[index - 1];
    return {
      ...row,
      nameMy: formatAddonSelections(
        localizeAddonSelections("my", [
          {
            name: link.addon.name,
            nameMy: link.addon.nameMy,
            groupName: link.addon.addonCategory?.name ?? null,
            groupNameMy: link.addon.addonCategory?.nameMy,
          },
        ]),
      ),
    };
  });
}

/** One round as the bill reads it — also the table occupancy rule's
 *  input (lib/order/tableOccupancy.ts). */
export interface BillSourceRound<Time> {
  orderNumber: string;
  createdAt: Time;
  status: string;
  orders: BillLine[];
}

/** A round the counter has accepted — any open round past
 *  PENDING_APPROVAL. Its lines belong on the bill; a round still
 *  awaiting approval could be rejected, so it never does. */
function isAcceptedRound(round: { status: string }) {
  return round.status !== "PENDING_APPROVAL";
}

/** Whether an entry has anything to print: at least one accepted round
 *  (the receipt prints accepted rounds only). The one place this rule
 *  lives — the bill's Print button and the Order List card's print
 *  icon both use it. */
export function canPrintBill(rounds: readonly { status: string }[]) {
  return rounds.some(isAcceptedRound);
}

/**
 * What an Order List entry's bill shows: every round that has been
 * accepted (anything past PENDING_APPROVAL), line by line, and — kept
 * apart — the rounds still awaiting approval with just their amount.
 * `total` is what can be charged now: accepted rounds only; a pending
 * round could still be rejected, so it's never part of it (it's in
 * `pendingAmount`). Rounds keep the order they're given in. Pure, and
 * priced only through orderLineTotal/orderLinesTotal.
 */
export function buildEntryBill<Time>(rounds: BillSourceRound<Time>[]) {
  const accepted = rounds.filter(isAcceptedRound);
  const pending = rounds.filter((round) => !isAcceptedRound(round));

  const pendingRounds = pending.map((round) => ({
    orderNumber: round.orderNumber,
    amount: orderLinesTotal(round.orders),
  }));

  return {
    // Only what's payable: voided units are left out — a line voided in
    // full isn't listed, a partly voided one shows what's left, and a
    // round with nothing left isn't on the bill at all. (The round cards
    // keep the voids, struck through, for staff.)
    acceptedRounds: accepted
      .map((round) => ({
        orderNumber: round.orderNumber,
        time: round.createdAt,
        // Table rounds keep one row per customer per line; the Backoffice
        // shows identical lines merged ("Iced Latte ×2") — display only,
        // the total is unchanged.
        lines: mergeLinesForDisplay(round.orders)
          .filter((line) => effectiveQuantity(line) > 0)
          .map((line) => ({
            id: line.id,
            lineTotal: orderLineTotal(line),
            // Item, then one row per add-on — what BillLineRows renders —
            // for the units still charged.
            breakdown: withMyanmarNames(
              lineBreakdown({
                name: line.menu.name,
                quantity: effectiveQuantity(line),
                unitPrice: line.unitPrice,
                addons: line.OrdersAddons.map((link) => ({
                  name: link.addon.name,
                  groupName: link.addon.addonCategory?.name ?? null,
                  unitPrice: link.unitPrice,
                })),
              }),
              line,
            ),
          })),
      }))
      .filter((round) => round.lines.length > 0),
    pendingRounds,
    total: accepted.reduce(
      (sum, round) => sum + orderLinesTotal(round.orders),
      0,
    ),
    pendingAmount: pendingRounds.reduce((sum, round) => sum + round.amount, 0),
  };
}

export type EntryBill<Time = string> = ReturnType<typeof buildEntryBill<Time>>;

/** buildEntryBill for an entry's sessions as the Service returns them:
 *  oldest round first (the order a receipt reads) and times as ISO
 *  strings, ready to cross to a Client Component. Shared by the detail
 *  page's bill and the printable receipt. */
export function buildEntryBillFromSessions(
  sessions: (BillSourceRound<Date> & { id: number })[],
): EntryBill {
  return buildEntryBill(
    [...sessions]
      .sort((a, b) => a.id - b.id)
      .map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
      })),
  );
}

/** How many items a list of lines holds — quantities summed, since an
 *  identical pick merges into one line ("Latte ×2" is 2 items). Behind
 *  Table QR's draft badge and the staff New Order cart (the Counter
 *  badge counts the browser cart — see browserCart.itemCount). */
export function sumQuantities(lines: readonly { quantity: number }[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** A client cart after a successful add. The server may have merged the
 *  add into an existing line (see addItemToCart) and returns that line
 *  with its new total quantity: update it in place (keeping its note
 *  and add-ons as they are) — otherwise append the new line. */
export function applyAddedLine<Line extends { id: number; quantity: number }>(
  cart: readonly Line[],
  added: Line,
): Line[] {
  return cart.some((line) => line.id === added.id)
    ? cart.map((line) =>
        line.id === added.id ? { ...line, quantity: added.quantity } : line,
      )
    : [...cart, added];
}
