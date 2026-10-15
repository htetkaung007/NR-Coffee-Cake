"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocale, useMessages } from "next-intl";
import { formatAmount, formatMoneyDelta } from "@/app/lib/orderFormat";
import { orderUiLabels } from "@/app/lib/i18n/customerLabels";

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
    /** An add-on group's hint: required → pick one; optional → any. */
    chooseOne: string;
    chooseAny: string;
    optional: string;
    /** A required group once it's answered. */
    done: string;
    /** Above a disabled Add: "Please choose: Size, Spicy level". */
    pleaseChoose: (groups: string) => string;
    /** The picks so far: "Your choice: Hot · Large". */
    yourChoice: (choices: string) => string;
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
    chooseOne: "Choose 1",
    chooseAny: "Choose any",
    optional: "Optional",
    done: "✓ Done",
    pleaseChoose: (groups) => `Please choose: ${groups}`,
    yourChoice: (choices) => `Your choice: ${choices}`,
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

/** Provides a given set of words — the Backoffice's "Customer sees"
 *  preview (the customer's words for a chosen language). */
export function OrderUiLabelsProvider({
  value,
  children,
}: {
  value: OrderUiLabels;
  children: ReactNode;
}) {
  return (
    <OrderUiLabelsContext.Provider value={value}>{children}</OrderUiLabelsContext.Provider>
  );
}

/** The storefront's provider: the same words from messages/*.json, in
 *  the customer's language (lib/i18n/customerLabels — the one mapping,
 *  shared with the Backoffice's မြန်မာ views). */
export function CustomerOrderUiLabels({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const messages = useMessages();
  const labels = useMemo(() => orderUiLabels(locale, messages), [locale, messages]);
  return <OrderUiLabelsProvider value={labels}>{children}</OrderUiLabelsProvider>;
}
