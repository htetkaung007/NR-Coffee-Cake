import { z } from "zod";
import type { CartLineInput, CartValidationResult } from "./cartValidation";
import { lineMergeKey } from "./orderLineMerge";
import { normalizeOrderNote } from "./orderNote";
import { orderNoteSchema, positiveInt } from "./schemas/customerOrderSchema";

/** What a line shows while the customer builds the cart — for rendering
 *  only. The server never trusts any of it: prices are re-read from the
 *  catalog (see validateCartLines); unitPrice only travels back as
 *  displayedUnitPrice, to detect "the price changed since you saw it". */
export interface BrowserCartLineDisplay {
  name: string;
  unitPrice: number;
  addons: { id: number; name: string; unitPrice: number }[];
  imageUrl: string | null;
}

export interface BrowserCartLine {
  menuId: number;
  addonIds: number[];
  quantity: number;
  note: string | null;
  display: BrowserCartLineDisplay;
}

/** The Counter customer's cart as kept in the browser (localStorage),
 *  one per location. clientRequestId is the idempotency key for
 *  submitting it (see OrderSession.clientRequestId). */
export interface BrowserCart {
  version: 1;
  locationId: number;
  clientRequestId: string | null;
  updatedAt: string;
  lines: BrowserCartLine[];
}

/** A fixed timestamp for a cart nobody has touched — keeps emptyCart
 *  pure (no clock), so two empty carts are always equal. */
const NEVER_UPDATED = new Date(0).toISOString();

export function emptyCart(locationId: number): BrowserCart {
  return {
    version: 1,
    locationId,
    clientRequestId: null,
    updatedAt: NEVER_UPDATED,
    lines: [],
  };
}

/** THE merge rule (lineMergeKey, shared with the server carts): same
 *  menu, same add-on set and the same note as far as the rule can tell,
 *  at the prices the customer is shown. */
function mergeKey(line: BrowserCartLine) {
  const addonPrices = new Map(
    line.display.addons.map((addon) => [addon.id, addon.unitPrice]),
  );
  return lineMergeKey(
    line.menuId,
    line.display.unitPrice,
    line.addonIds.map((addonId) => ({
      addonId,
      unitPrice: addonPrices.get(addonId) ?? 0,
    })),
    line.note,
  );
}

/** Stored form of a new/edited line: add-on ids once each, a blank note
 *  as null (one "no note" representation, as on the server). */
function normalizeLine(line: BrowserCartLine): BrowserCartLine {
  return {
    ...line,
    addonIds: [...new Set(line.addonIds)],
    note: normalizeOrderNote(line.note),
  };
}

/** A cart with new lines. The request id belongs to a non-empty cart:
 *  kept while lines exist (so a retried submit reuses it), dropped once
 *  the cart is empty. */
function withLines(
  cart: BrowserCart,
  lines: BrowserCartLine[],
  now: string,
): BrowserCart {
  return {
    ...cart,
    lines,
    updatedAt: now,
    clientRequestId: lines.length > 0 ? cart.clientRequestId : null,
  };
}

/** Puts `line` into `lines`: onto an identical line's quantity if there
 *  is one, otherwise at the end. */
function mergeInto(lines: BrowserCartLine[], line: BrowserCartLine) {
  const key = mergeKey(line);
  const sameIndex = lines.findIndex((existing) => mergeKey(existing) === key);
  if (sameIndex === -1) return [...lines, line];
  return lines.map((existing, index) =>
    index === sameIndex
      ? { ...existing, quantity: existing.quantity + line.quantity }
      : existing,
  );
}

/** Adds a line, merging it into an identical one (quantities summed).
 *  The first line of a cart gets the cart's request id (newId). */
export function addLine(
  cart: BrowserCart,
  line: BrowserCartLine,
  now: string,
  newId: () => string,
): BrowserCart {
  const next = withLines(cart, mergeInto(cart.lines, normalizeLine(line)), now);
  return { ...next, clientRequestId: cart.clientRequestId ?? newId() };
}

/** Sets a line's quantity; 0 or less removes the line. */
export function setQuantity(
  cart: BrowserCart,
  index: number,
  quantity: number,
  now: string,
): BrowserCart {
  if (quantity <= 0) return removeLine(cart, index, now);
  return withLines(
    cart,
    cart.lines.map((line, i) => (i === index ? { ...line, quantity } : line)),
    now,
  );
}

export function removeLine(
  cart: BrowserCart,
  index: number,
  now: string,
): BrowserCart {
  return withLines(
    cart,
    cart.lines.filter((_, i) => i !== index),
    now,
  );
}

/** Replaces a line (new add-ons, note, quantity). If it has become
 *  identical to another line, the two merge into that other line. */
export function updateLine(
  cart: BrowserCart,
  index: number,
  line: BrowserCartLine,
  now: string,
): BrowserCart {
  const others = cart.lines.filter((_, i) => i !== index);
  const edited = normalizeLine(line);
  const key = mergeKey(edited);
  if (others.some((other) => mergeKey(other) === key)) {
    return withLines(cart, mergeInto(others, edited), now);
  }
  return withLines(
    cart,
    cart.lines.map((existing, i) => (i === index ? edited : existing)),
    now,
  );
}

/** Empties the cart — after a successful submit, or on request. The
 *  next first line gets a fresh request id. */
export function clear(cart: BrowserCart, now: string): BrowserCart {
  return withLines(cart, [], now);
}

/** Refreshes what each line shows (name, unit price, add-on prices)
 *  from a server validation result, matched by position. A result that
 *  doesn't line up with the cart (it changed meanwhile) is ignored, and
 *  so is a line the server couldn't price. Not a customer change, so
 *  updatedAt stays as it is. */
export function applyValidation(
  cart: BrowserCart,
  result: CartValidationResult,
): BrowserCart {
  if (result.lines.length !== cart.lines.length) return cart;
  return {
    ...cart,
    lines: cart.lines.map((line, index) => {
      const checked = result.lines[index];
      if (checked.name === null || checked.unitPrice === null) return line;
      // addonPrices follow the line's (unique) addonIds; only a full set
      // can be matched back to ids.
      const addonPrices =
        checked.addonPrices.length === line.addonIds.length
          ? new Map(line.addonIds.map((id, i) => [id, checked.addonPrices[i]]))
          : null;
      return {
        ...line,
        display: {
          ...line.display,
          name: checked.name,
          unitPrice: checked.unitPrice,
          addons: line.display.addons.map((addon) => ({
            ...addon,
            unitPrice: addonPrices?.get(addon.id) ?? addon.unitPrice,
          })),
        },
      };
    }),
  };
}

/** How many items the cart badge counts — quantities summed. */
export function itemCount(cart: BrowserCart): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** What the server gets: the customer's choices, plus the unit price
 *  they were shown (only used to detect a price change). */
export function toServerLines(cart: BrowserCart): CartLineInput[] {
  return cart.lines.map((line) => ({
    menuId: line.menuId,
    addonIds: line.addonIds,
    quantity: line.quantity,
    note: line.note,
    displayedUnitPrice: line.display.unitPrice,
  }));
}

/** A new cart line from the item-detail dialog: the customer's picks,
 *  plus what the dialog showed (current name, price, add-on prices and
 *  photo) for rendering. An add-on id the menu doesn't offer is dropped. */
export function toBrowserCartLine(
  detail: {
    id: number;
    name: string;
    price: number;
    imageUrl: string | null;
    addonCategories: { addons: { id: number; name: string; price: number }[] }[];
  },
  quantity: number,
  addonIds: number[],
  note: string,
): BrowserCartLine {
  const offered = new Map(
    detail.addonCategories
      .flatMap((category) => category.addons)
      .map((addon) => [addon.id, addon]),
  );
  const addons = [...new Set(addonIds)].flatMap((id) => {
    const addon = offered.get(id);
    return addon ? [{ id, name: addon.name, unitPrice: addon.price }] : [];
  });
  return {
    menuId: detail.id,
    addonIds: addons.map((addon) => addon.id),
    quantity,
    note,
    display: {
      name: detail.name,
      unitPrice: detail.price,
      addons,
      imageUrl: detail.imageUrl,
    },
  };
}

const money = z.number().int().nonnegative();

const storedCartSchema = z.object({
  version: z.literal(1),
  locationId: positiveInt,
  clientRequestId: z.uuid().nullable(),
  updatedAt: z.iso.datetime(),
  lines: z.array(
    z.object({
      menuId: positiveInt,
      addonIds: z.array(positiveInt),
      // Any positive count: a merge can pass the per-add cap, and the
      // server reports that line as "invalid" rather than the whole
      // cart being thrown away here.
      quantity: positiveInt,
      note: orderNoteSchema.nullable().transform((note) => note ?? null),
      display: z.object({
        name: z.string(),
        unitPrice: money,
        addons: z.array(
          z.object({ id: positiveInt, name: z.string(), unitPrice: money }),
        ),
        imageUrl: z.string().nullable(),
      }),
    }),
  ),
});

/** Reads a stored cart (localStorage text). Anything unusable — nothing
 *  stored, not JSON, the wrong shape or version, or another location's
 *  cart — gives an empty cart; never throws. */
export function parseCart(raw: string | null, locationId: number): BrowserCart {
  if (raw === null) return emptyCart(locationId);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return emptyCart(locationId);
  }
  const parsed = storedCartSchema.safeParse(json);
  if (!parsed.success || parsed.data.locationId !== locationId) {
    return emptyCart(locationId);
  }
  return parsed.data;
}
