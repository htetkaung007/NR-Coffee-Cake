/** From this many left a menu is simply "in stock"; 1 to one below it
 *  is "low". The one threshold the customer and Backoffice cards share. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockKind = "inStock" | "low" | "soldOut";

/** How a stock quantity reads on a card: kind (for the chip's colour
 *  role) and a label that says it in words. A negative quantity reads as
 *  sold out. */
export function stockBadge(quantity: number): { kind: StockKind; label: string } {
  if (quantity <= 0) return { kind: "soldOut", label: "Sold out" };
  if (quantity < LOW_STOCK_THRESHOLD) return { kind: "low", label: `${quantity} left` };
  return { kind: "inStock", label: `${quantity} in stock` };
}
