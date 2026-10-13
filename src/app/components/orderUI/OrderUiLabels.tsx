"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatAmount, formatMoneyDelta } from "@/app/lib/orderFormat";
import { useCustomerPrice } from "@/app/lib/hooks/useCustomerPrice";

/**
 * The words of the order components shared with the Backoffice's New
 * Order screen — the menu detail dialog / sheet and CartLineNotice. The
 * Backoffice has no translations (next-intl lives in the storefront
 * only), so these components read their words from this context: the
 * DEFAULT is English (what the Backoffice gets), and the storefront
 * layout provides the customer's language (CustomerOrderUiLabels).
 */
export interface OrderUiLabels {
  /** Which language shop data names show in (lib/i18n/localizedText):
   *  "en" in the Backoffice, the customer's choice in the storefront. */
  locale: string;
  /** A price and an add-on's extra: "4,500 MMK" / "+500 MMK" in the
   *  Backoffice, "4,500 Kyats" / "4,500 ကျပ်" for customers. */
  price: (amount: number) => string;
  priceDelta: (amount: number) => string;
  menuDetail: {
    addToCart: string;
    saveChanges: string;
    quantity: string;
    decrease: string;
    increase: string;
    onlyLeft: (count: number) => string;
    required: string;
    free: string;
    noteLabel: string;
    noteWords: (count: number, max: number) => string;
    couldNotLoad: string;
    justSoldOut: string;
    close: string;
  };
  lineNotice: {
    priceUpdated: string;
    priceEach: (price: string) => string;
    changeTo: (quantity: number) => string;
    onlyLeft: (count: number) => string;
    soldOut: string;
    unavailable: string;
    addonUnavailable: string;
    invalid: string;
    remove: string;
    edit: string;
  };
}

const ENGLISH: OrderUiLabels = {
  locale: "en",
  price: formatAmount,
  priceDelta: formatMoneyDelta,
  menuDetail: {
    addToCart: "Add to Cart",
    saveChanges: "Save Changes",
    quantity: "Quantity",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    onlyLeft: (count) => `Only ${count} left`,
    required: "Required",
    free: "Free",
    noteLabel: "Special instructions (optional)",
    noteWords: (count, max) => `${count}/${max} words`,
    couldNotLoad: "This item couldn't be loaded.",
    justSoldOut: "This item just sold out.",
    close: "Close",
  },
  lineNotice: {
    priceUpdated: "Price updated:",
    priceEach: (price) => `${price} each`,
    changeTo: (quantity) => `Change to ×${quantity}`,
    onlyLeft: (count) => `Only ${count} left`,
    soldOut: "Sold out — not included in the total",
    unavailable: "No longer available — not included in the total",
    addonUnavailable: "An option you picked is no longer available",
    invalid: "Choose a quantity from 1 to 99",
    remove: "Remove",
    edit: "Edit",
  },
};

const OrderUiLabelsContext = createContext<OrderUiLabels>(ENGLISH);

export function useOrderUiLabels(): OrderUiLabels {
  return useContext(OrderUiLabelsContext);
}

/** The storefront's provider: the same words from messages/*.json, in
 *  the customer's language. */
export function CustomerOrderUiLabels({ children }: { children: ReactNode }) {
  const tDetail = useTranslations("menuDetail");
  const tNotice = useTranslations("lineNotice");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { price, priceDelta } = useCustomerPrice();
  const labels: OrderUiLabels = {
    locale,
    price,
    priceDelta,
    menuDetail: {
      addToCart: tDetail("addToCart"),
      saveChanges: tDetail("saveChanges"),
      quantity: tDetail("quantity"),
      decrease: tDetail("decrease"),
      increase: tDetail("increase"),
      onlyLeft: (count) => tDetail("onlyLeft", { count }),
      required: tDetail("required"),
      free: tDetail("free"),
      noteLabel: tDetail("noteLabel"),
      noteWords: (count, max) => tDetail("noteWords", { count, max }),
      couldNotLoad: tDetail("couldNotLoad"),
      justSoldOut: tDetail("justSoldOut"),
      close: tCommon("close"),
    },
    lineNotice: {
      priceUpdated: tNotice("priceUpdated"),
      priceEach: (price) => tNotice("priceEach", { price }),
      changeTo: (quantity) => tNotice("changeTo", { quantity }),
      onlyLeft: (count) => tNotice("onlyLeft", { count }),
      soldOut: tNotice("soldOut"),
      unavailable: tNotice("unavailable"),
      addonUnavailable: tNotice("addonUnavailable"),
      invalid: tNotice("invalid"),
      remove: tCommon("remove"),
      edit: tCommon("edit"),
    },
  };
  return (
    <OrderUiLabelsContext.Provider value={labels}>{children}</OrderUiLabelsContext.Provider>
  );
}
