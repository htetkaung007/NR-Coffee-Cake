/** What a Backoffice menu card shows at the selected location. */
export type MenuCardStatus = "available" | "unavailable" | "soldOut" | "hidden";

/** THE card state, by precedence: hidden here (not listed at all) >
 *  unavailable (switched off on purpose) > sold out (stock 0, switch on)
 *  > available. Display only — orderability is isMenuOrderable's. */
export function menuCardStatus(facts: {
  stockQuantity: number;
  isManuallyDisabled: boolean;
  isHiddenHere: boolean;
}): MenuCardStatus {
  if (facts.isHiddenHere) return "hidden";
  if (facts.isManuallyDisabled) return "unavailable";
  if (facts.stockQuantity <= 0) return "soldOut";
  return "available";
}
