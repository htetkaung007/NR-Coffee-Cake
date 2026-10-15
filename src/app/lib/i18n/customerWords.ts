import { createTranslator } from "next-intl";
import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";
import type { AppLocale } from "./locale";
import { formatAmountParts } from "../orderFormat";

const MESSAGES = { en, my } as const;

/**
 * The customer's own money words in `locale`, for Backoffice screens that
 * show what customers see (the add-on group form's "Customer sees"
 * preview, the Add-ons panel's မြန်မာ view) — no next-intl provider
 * there. The SAME keys and number formatting as the storefront
 * (common.price / common.priceDelta via useCustomerPrice, menuDetail.free
 * / .required), read from messages/*.json; never repeated as literals.
 * Pure, client-safe.
 */
export function customerWords(locale: AppLocale) {
  const messages = MESSAGES[locale];
  const tCommon = createTranslator({ locale, messages, namespace: "common" });
  const tDetail = createTranslator({
    locale,
    messages,
    namespace: "menuDetail",
  });
  return {
    /** "1,000 ကျပ်" / "1,000 Kyats". */
    price: (amount: number) =>
      tCommon("price", { amount: formatAmountParts(amount).value }),
    /** "+500 ကျပ်" / "+500 Kyats". */
    priceDelta: (amount: number) =>
      tCommon("priceDelta", { amount: formatAmountParts(amount).value }),
    free: tDetail("free"),
    required: tDetail("required"),
  };
}
