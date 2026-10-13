"use client";

import { useTranslations } from "next-intl";
import { formatAmountParts } from "@/app/lib/orderFormat";

/** Customer-side prices: "4,500 Kyats" / "4,500 ကျပ်" (common.price —
 *  the number from the shared formatter, never "MMK"), and "+500 Kyats"
 *  for an add-on's extra (common.priceDelta). Storefront only — the
 *  Backoffice, /print, Reports and CSV keep formatAmount's "MMK". */
export function useCustomerPrice() {
  const t = useTranslations("common");
  return {
    price: (amount: number) => t("price", { amount: formatAmountParts(amount).value }),
    priceDelta: (amount: number) =>
      t("priceDelta", { amount: formatAmountParts(amount).value }),
  };
}
