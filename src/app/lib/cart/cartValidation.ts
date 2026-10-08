import { quantity as quantitySchema } from "../schemas/customerOrderSchema";
import { lineTotal } from "../order/orderTotals";
import {
  findUnpickedRequiredGroup,
  type RequiredAddonGroup,
} from "./addonSelection";

/** Server-side validation of a browser-held cart (Counter / Online carts
 *  live in localStorage and reach the server only to be checked — when
 *  the cart page opens or regains focus — and on submit). Both paths go
 *  through validateCartLines, so they can never disagree. Pure: the
 *  Service loads a CartCatalog for ONE location and passes it in, so
 *  the rules are unit-tested without a database or mocks. */

/** One cart line as the browser sends it. */
export interface CartLineInput {
  menuId: number;
  addonIds: number[];
  quantity: number;
  note: string | null;
  /** The menu unit price the customer last saw. Used ONLY to detect "the
   *  price changed since you looked" — never to compute a total, so a
   *  tampered value can't lower what gets charged. */
  displayedUnitPrice?: number;
}

export interface CatalogAddon {
  name: string;
  /** Today's price — what the line is charged. */
  price: number;
  isAvailable: boolean;
}

/** A required add-on group — see findUnpickedRequiredGroup, the rule
 *  this shares with OrderSessionCartService.validateAddonSelection. */
export type CatalogRequiredAddonGroup = RequiredAddonGroup;

/** One menu as orderable at the catalog's location. */
export interface CatalogMenu {
  name: string;
  /** Today's price — what the line is charged. */
  price: number;
  /** Not archived, staff-available (not manually disabled), not disabled
   *  at this location, and at least one of its categories visible here. */
  isOrderable: boolean;
  /** MenuStock.quantity at this location. */
  stockQuantity: number;
  /** Every add-on this menu may carry (via its linked, non-archived add-on
   *  categories). An id not in here is not allowed on this menu. */
  allowedAddons: ReadonlyMap<number, CatalogAddon>;
  requiredAddonGroups: readonly CatalogRequiredAddonGroup[];
}

/** Menu id → menu, for ONE location. A menu id that's missing is not
 *  sold here (another location's menu, or deleted). */
export type CartCatalog = ReadonlyMap<number, CatalogMenu>;

export type CartLineStatus =
  | "ok"
  | "priceChanged"
  | "insufficientStock"
  | "soldOut"
  | "unavailable"
  | "addonUnavailable"
  | "invalid";

export interface ValidatedCartLine {
  /** Position of this line in the input array — how the UI finds the row. */
  index: number;
  status: CartLineStatus;
  /** From the catalog; null only when the menu isn't in it. */
  name: string | null;
  /** Current catalog price; null only when the menu isn't in it. */
  unitPrice: number | null;
  /** Current catalog prices of the line's add-ons, in input order. */
  addonPrices: number[];
  /** By orderTotals' lineTotal rule at CURRENT prices; null when it
   *  can't be priced (invalid quantity, or the menu or an add-on
   *  missing from the catalog). */
  lineTotal: number | null;
  /** insufficientStock / soldOut: the menu's stock at this location. */
  availableQuantity?: number;
  /** priceChanged: the displayedUnitPrice the customer last saw. */
  previousUnitPrice?: number;
}

export interface CartValidationResult {
  lines: ValidatedCartLine[];
  /** Sum of lineTotal over the lines that can be ordered ("ok" and
   *  "priceChanged") — never includes a blocked line. */
  total: number;
  /** True only when the cart has at least one line and every line is
   *  "ok" or "priceChanged". */
  canSubmit: boolean;
}

/** Statuses that still let the cart be submitted — the customer has
 *  seen the line as it is now. Everything else blocks submit and keeps
 *  the line out of the total. */
const SUBMITTABLE: ReadonlySet<CartLineStatus> = new Set(["ok", "priceChanged"]);

/** Same bounds as every other cart/draft action (customerOrderSchema's
 *  `quantity`: a whole number 1–99) — one definition, not a copy. */
function isValidQuantity(quantity: number) {
  return quantitySchema.safeParse(quantity).success;
}

/** On the menu at this location and orderable right now. */
function findOrderableMenu(catalog: CartCatalog, menuId: number) {
  const menu = catalog.get(menuId);
  return menu?.isOrderable ? menu : null;
}

/** Duplicate add-on ids count once — the same as the merge rule
 *  (lineMergeKey) and the order the ids were first picked in. */
function uniqueAddonIds(line: CartLineInput) {
  return [...new Set(line.addonIds)];
}

/** Every picked add-on is allowed on this menu and available, and every
 *  required add-on group has a pick (the shared required-group rule). */
function hasValidAddons(menu: CatalogMenu, addonIds: readonly number[]) {
  const allAllowedAndAvailable = addonIds.every(
    (id) => menu.allowedAddons.get(id)?.isAvailable === true,
  );
  return (
    allAllowedAndAvailable &&
    findUnpickedRequiredGroup(addonIds, menu.requiredAddonGroups) === null
  );
}

/** Stock is per MENU, not per line: two lines of the same menu (e.g.
 *  different notes) draw on the same stock, so their quantities are
 *  added up. Only lines with a valid quantity count. */
function combinedQuantityByMenu(lines: readonly CartLineInput[]) {
  const totals = new Map<number, number>();
  for (const line of lines) {
    if (!isValidQuantity(line.quantity)) continue;
    totals.set(line.menuId, (totals.get(line.menuId) ?? 0) + line.quantity);
  }
  return totals;
}

/** soldOut at 0 stock; insufficientStock when the menu's lines together
 *  ask for more than there is — every line of that menu is flagged,
 *  since any of them could be the one the customer reduces. */
function stockStatus(
  menu: CatalogMenu,
  combinedQuantity: number,
): "soldOut" | "insufficientStock" | null {
  if (menu.stockQuantity <= 0) return "soldOut";
  if (combinedQuantity > menu.stockQuantity) return "insufficientStock";
  return null;
}

/** Only a price the customer was actually shown can have "changed". */
function hasPriceChanged(line: CartLineInput, menu: CatalogMenu) {
  return (
    line.displayedUnitPrice !== undefined &&
    line.displayedUnitPrice !== menu.price
  );
}

/** Current catalog prices, and the line total by THE line-total rule
 *  (orderTotals.lineTotal) — never from displayedUnitPrice. */
function priceLine(
  line: CartLineInput,
  menu: CatalogMenu | undefined,
  addonIds: readonly number[],
) {
  const addonPrices = addonIds.flatMap((id) => {
    const addon = menu?.allowedAddons.get(id);
    return addon ? [addon.price] : [];
  });
  const canPrice =
    menu !== undefined &&
    addonPrices.length === addonIds.length &&
    isValidQuantity(line.quantity);
  return {
    name: menu?.name ?? null,
    unitPrice: menu?.price ?? null,
    addonPrices,
    lineTotal: canPrice
      ? lineTotal(menu.price, addonPrices, line.quantity)
      : null,
  };
}

/** One line's status. The first problem found wins, most fundamental
 *  first: a bad quantity, then the menu itself, then its add-ons, then
 *  stock — and a price change only when nothing blocks the line. */
function checkLine(
  line: CartLineInput,
  addonIds: readonly number[],
  catalog: CartCatalog,
  combinedQuantity: ReadonlyMap<number, number>,
): Pick<ValidatedCartLine, "status" | "availableQuantity" | "previousUnitPrice"> {
  if (!isValidQuantity(line.quantity)) return { status: "invalid" };

  const menu = findOrderableMenu(catalog, line.menuId);
  if (!menu) return { status: "unavailable" };

  if (!hasValidAddons(menu, addonIds)) return { status: "addonUnavailable" };

  const stock = stockStatus(menu, combinedQuantity.get(line.menuId) ?? 0);
  if (stock) return { status: stock, availableQuantity: menu.stockQuantity };

  if (hasPriceChanged(line, menu)) {
    return { status: "priceChanged", previousUnitPrice: line.displayedUnitPrice };
  }
  return { status: "ok" };
}

/**
 * Checks a browser-held cart against ONE location's catalog, line by
 * line (see ValidatedCartLine for what each status means). Totals come
 * from the catalog's current prices only, and only lines that can still
 * be ordered count towards `total`.
 */
export function validateCartLines(
  lines: readonly CartLineInput[],
  catalog: CartCatalog,
): CartValidationResult {
  const combinedQuantity = combinedQuantityByMenu(lines);

  const validated = lines.map((line, index): ValidatedCartLine => {
    const addonIds = uniqueAddonIds(line);
    return {
      index,
      ...priceLine(line, catalog.get(line.menuId), addonIds),
      ...checkLine(line, addonIds, catalog, combinedQuantity),
    };
  });

  const submittable = validated.filter((line) => SUBMITTABLE.has(line.status));
  return {
    lines: validated,
    total: submittable.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0),
    canSubmit: validated.length > 0 && submittable.length === validated.length,
  };
}

export type SubmitDecision = "ok" | "needsAttention" | "pricesChanged";

/** Whether this browser could send its cart right now (it has a usable
 *  Counter scan for the location, and no order waiting for the cashier)
 *  — see CartSubmitService.getSendState. */
export type SendState = "canSend" | "needsScan" | "awaitingApproval";

/** Whether a validated cart may be turned into an order right now:
 *  "needsAttention" when any line is blocked (or the cart is empty),
 *  else "pricesChanged" when the customer hasn't seen a new price yet —
 *  a changed price is never charged silently — else "ok". */
export function decideSubmit(result: CartValidationResult): SubmitDecision {
  if (!result.canSubmit) return "needsAttention";
  if (result.lines.some((line) => line.status === "priceChanged")) {
    return "pricesChanged";
  }
  return "ok";
}
