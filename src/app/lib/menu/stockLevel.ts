/** From this many left a menu is simply "in stock"; 1 to one below it
 *  is "low". The one threshold the customer and Backoffice cards share. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockKind = "inStock" | "low" | "soldOut";

/** How a stock quantity reads on a card: its kind (for the chip's
 *  colour role; the card says it in words — "Sold out", "3 left", "8 in
 *  stock" — in the staff's language). A negative quantity reads as sold
 *  out. */
export function stockBadge(quantity: number): { kind: StockKind } {
  if (quantity <= 0) return { kind: "soldOut" };
  if (quantity < LOW_STOCK_THRESHOLD) return { kind: "low" };
  return { kind: "inStock" };
}
