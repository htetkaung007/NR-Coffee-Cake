import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";
import type { AppLocale } from "./locale";
import {
  allCategoriesLabel,
  customerPrices,
  menuCardLabels,
  orderUiLabels,
} from "./customerLabels";

const MESSAGES = { en, my } as const;

/** All of a language's customer words (see customerWords). */
function buildCustomerWords(locale: AppLocale) {
  const messages = MESSAGES[locale];
  const orderUi = orderUiLabels(locale, messages);
  const { price, priceDelta } = customerPrices(locale, messages);
  return {
    /** "1,000 ကျပ်" / "1,000 Kyats". */
    price,
    /** "+500 ကျပ်" / "+500 Kyats". */
    priceDelta,
    free: orderUi.menuDetail.free,
    required: orderUi.menuDetail.required,
    /** The menu's "All" tab. */
    allCategories: allCategoriesLabel(locale, messages),
    /** MenuCard's words (the Myanmar Add: "ထည့်မယ်"). */
    cardLabels: menuCardLabels(locale, messages),
    /** The menu detail dialog / sheet's words (OrderUiLabels). */
    orderUi,
  };
}

type CustomerWords = ReturnType<typeof buildCustomerWords>;

/** Built once per language, on first use — every caller gets the same
 *  (immutable) object, so nothing needs memoising. */
const cache = new Map<AppLocale, CustomerWords>();

/**
 * The customer's own words in `locale`, for Backoffice screens that show
 * what a customer could read (the add-on group form's "Customer sees"
 * preview, the Add-ons panel's and staff New Order's မြန်မာ views) — no
 * next-intl provider there, so the bundled messages/*.json are read
 * through the same builders the storefront uses (lib/i18n/
 * customerLabels); never repeated as literals. Pure, client-safe.
 */
export function customerWords(locale: AppLocale): CustomerWords {
  let words = cache.get(locale);
  if (!words) {
    words = buildCustomerWords(locale);
    cache.set(locale, words);
  }
  return words;
}

/** The Myanmar words when `locale` is Myanmar; null for English (or not
 *  known yet) — where the caller keeps its Backoffice English defaults. */
export function myanmarWordsOrNull(
  locale: AppLocale | null,
): CustomerWords | null {
  return locale === "my" ? customerWords("my") : null;
}
