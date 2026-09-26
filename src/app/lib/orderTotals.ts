/** An Order row with what its price depends on — see orderLineTotal.
 *  unitPrice/unitPrice below are each line's own PRICE SNAPSHOT (taken
 *  when the line was added), never Menu.price/Addon.price — a later
 *  price change must not alter an already-placed order's total. */
interface PricedOrderLine {
  quantity: number;
  unitPrice: number;
  OrdersAddons: { unitPrice: number }[];
}

/** The one definition of what a line costs: its snapshot unit price ×
 *  quantity plus the sum of its selected addons' snapshot prices
 *  (addons are counted once per line, not per unit — this is the
 *  billing formula the cashier's total is built from). Shared so the
 *  cashier list, the customer's receipt, the order-confirmed screen
 *  and history can't disagree. */
export function orderLineTotal(order: PricedOrderLine) {
  const addonsTotal = order.OrdersAddons.reduce(
    (sum, link) => sum + link.unitPrice,
    0,
  );
  return order.unitPrice * order.quantity + addonsTotal;
}

export function orderLinesTotal(orders: PricedOrderLine[]) {
  return orders.reduce((sum, order) => sum + orderLineTotal(order), 0);
}

/** An Order row as the bill and the round cards read it: its price
 *  snapshot inputs plus names, and whether each addon was a required
 *  pick. */
interface BillLine {
  id: number;
  quantity: number;
  unitPrice: number;
  menu: { name: string };
  OrdersAddons: {
    unitPrice: number;
    addon: {
      name: string;
      addonCategory: { isRequired: boolean };
    };
  }[];
}

/** Splits a line's addons into its variant (picks from a REQUIRED addon
 *  category — e.g. size "Large": the customer had to choose one, so it
 *  describes which version of the item this is) and its optional
 *  extras. The one place this rule lives; the bill's addonSummary and
 *  the order detail page's round cards both use it. */
export function describeLineAddons(line: Pick<BillLine, "OrdersAddons">) {
  const variantNames: string[] = [];
  const extraNames: string[] = [];
  for (const { addon } of line.OrdersAddons) {
    (addon.addonCategory.isRequired ? variantNames : extraNames).push(
      addon.name,
    );
  }
  return { variantText: variantNames.join(", "), extraNames };
}

/** "Large · +2 add-ons", "Large", "+1 add-on" or "" — the one-line
 *  summary under an item's name on the bill. */
function addonSummary(line: Pick<BillLine, "OrdersAddons">) {
  const { variantText, extraNames } = describeLineAddons(line);
  const extras =
    extraNames.length > 0
      ? `+${extraNames.length} ${extraNames.length === 1 ? "add-on" : "add-ons"}`
      : "";
  return [variantText, extras].filter(Boolean).join(" · ");
}

interface BillSourceRound<Time> {
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
    acceptedRounds: accepted.map((round) => ({
      orderNumber: round.orderNumber,
      time: round.createdAt,
      lines: round.orders.map((line) => ({
        id: line.id,
        name: line.menu.name,
        qty: line.quantity,
        addonSummary: addonSummary(line),
        lineTotal: orderLineTotal(line),
      })),
    })),
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

/** How many items the customer's cart badge should count — the sum of
 *  the lines' quantities, since identical lines merge into one line
 *  ("Cappuccino ×3" is 3 items; see addItemToCart). A Counter session
 *  keeps its order lines after Submit (status moves on to
 *  PENDING_APPROVAL/PENDING/COOKING), so only a CART session's lines
 *  are still "in the cart" — anything else counts 0 (MUI's Badge hides
 *  itself at 0). The one place this rule lives; every Counter screen
 *  that feeds OrderTopBar's cartItemCount goes through it. */
export function countUnsubmittedItems(
  status: string,
  cart: readonly { quantity: number }[],
) {
  return status === "CART" ? sumQuantities(cart) : 0;
}

/** How many items a list of lines holds — quantities summed, since an
 *  identical pick merges into one line ("Latte ×2" is 2 items). Behind
 *  both cart badges: Counter's (via countUnsubmittedItems) and Table
 *  QR's draft list. */
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
