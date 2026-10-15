import { createTranslator } from "next-intl";
import type enMessages from "../../../../messages/en.json";
import type { MenuCardLabels } from "@/app/components/MenuCard";
import type { OrderUiLabels } from "@/app/components/orderUI/OrderUiLabels";
import { formatAmountParts } from "../orderFormat";
import type { AppLocale } from "./locale";

/** A customer messages file (en.json / my.json — same keys, tested). */
type CustomerMessages = typeof enMessages;

/**
 * The customer's words for the parts shared with the Backoffice, built
 * from a messages file — the ONE mapping of message keys to labels. The
 * storefront passes its provider's messages (useMessages); Backoffice
 * screens that show what a customer could read (staff New Order's
 * မြန်မာ view, the add-on previews) pass the bundled file
 * (lib/i18n/customerWords). Pure (no hooks), client-safe.
 */

/** "4,500 Kyats" / "4,500 ကျပ်" and "+500 …" — common.price /
 *  common.priceDelta with the shared digits (as useCustomerPrice). */
export function customerPrices(locale: AppLocale, messages: CustomerMessages) {
  const t = createTranslator({ locale, messages, namespace: "common" });
  return {
    price: (amount: number) =>
      t("price", { amount: formatAmountParts(amount).value }),
    priceDelta: (amount: number) =>
      t("priceDelta", { amount: formatAmountParts(amount).value }),
  };
}

/** The menu card's words (MenuBrowser's, and New Order's မြန်မာ). */
export function menuCardLabels(
  locale: AppLocale,
  messages: CustomerMessages,
): MenuCardLabels {
  const t = createTranslator({ locale, messages, namespace: "menu" });
  return {
    outOfStock: t("outOfStock"),
    onlyLeft: (count) => t("onlyLeft", { count }),
    seeMore: t("seeMore"),
    viewDetails: (name, price) => t("viewDetails", { name, price }),
    outOfStockLabel: (name, price) => t("outOfStockLabel", { name, price }),
    price: customerPrices(locale, messages).price,
    // Myanmar: the words "ထည့်မယ်"; English: the + icon.
    addText: locale === "my" ? t("addShort") : null,
  };
}

/** The menu's "All" tab. */
export function allCategoriesLabel(
  locale: AppLocale,
  messages: CustomerMessages,
) {
  return createTranslator({ locale, messages, namespace: "menu" })("all");
}

/** The menu detail dialog / sheet and line notices' words (the
 *  OrderUiLabels context). */
export function orderUiLabels(
  locale: AppLocale,
  messages: CustomerMessages,
): OrderUiLabels {
  const tDetail = createTranslator({
    locale,
    messages,
    namespace: "menuDetail",
  });
  const tNotice = createTranslator({
    locale,
    messages,
    namespace: "lineNotice",
  });
  const tCommon = createTranslator({ locale, messages, namespace: "common" });
  const { price, priceDelta } = customerPrices(locale, messages);
  return {
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
      chooseOne: tDetail("chooseOne"),
      chooseAny: tDetail("chooseAny"),
      optional: tDetail("optional"),
      done: tDetail("done"),
      pleaseChoose: (groups) => tDetail("pleaseChoose", { groups }),
      yourChoice: (choices) => tDetail("yourChoice", { choices }),
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
}
