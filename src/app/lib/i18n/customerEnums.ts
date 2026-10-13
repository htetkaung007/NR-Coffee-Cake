import {
  CancelReason,
  ORDERSTATUS,
  VoidReason,
} from "../../../../prisma/generated/enums";

/**
 * The enum values customers can see, each with ONE translation key
 * (voidReason.<VALUE>, roundStatus.<VALUE>, cancelReason.<VALUE> in
 * messages/*.json). From the Prisma enums, so a new value can't be
 * forgotten — the test checks every one has words in both languages.
 * The Backoffice keeps its own English labels (lib/order/voids,
 * lib/order/cancelReason). Pure.
 */

export const VOID_REASON_VALUES = Object.values(VoidReason) as readonly VoidReason[];

/** A round's status as customers see it — the order statuses, plus
 *  WITHDRAWN for a round they cancelled themselves (customerRoundStatus). */
export const ROUND_STATUS_VALUES = [
  ...(Object.values(ORDERSTATUS) as ORDERSTATUS[]),
  "WITHDRAWN",
] as const;
export type CustomerRoundStatus = (typeof ROUND_STATUS_VALUES)[number];

export const CANCEL_REASON_VALUES = Object.values(CancelReason) as readonly CancelReason[];

export function isCustomerRoundStatus(status: string): status is CustomerRoundStatus {
  return (ROUND_STATUS_VALUES as readonly string[]).includes(status);
}
