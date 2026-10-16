"use client";

import { useMemo } from "react";
import { useLocale, useMessages } from "next-intl";
import { customerPrices } from "@/app/lib/i18n/customerLabels";

/** Customer-side prices: "4,500 Kyats" / "4,500 ကျပ်" (common.price —
 *  the number from the shared formatter, never "MMK"), and "+500 Kyats"
 *  for an add-on's extra (common.priceDelta) — customerPrices, the one
 *  implementation, in the customer's language. Storefront only — the
 *  Backoffice, /print, Reports and CSV keep formatAmount's "MMK". */
export function useCustomerPrice() {
  const locale = useLocale();
  const messages = useMessages();
  return useMemo(() => customerPrices(locale, messages), [locale, messages]);
}
