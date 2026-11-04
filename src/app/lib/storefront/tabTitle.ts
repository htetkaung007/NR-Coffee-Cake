import { getTranslations } from "next-intl/server";

/** The browser-tab title of a customer tab page — the bottom bar's own
 *  word for it (nav.*), in the customer's language (NEXT_LOCALE). The
 *  root layout's template adds " · NR Coffee". The zero-width spaces some
 *  Myanmar words carry for the landscape rail's line breaks
 *  (messages/my.json) mean nothing in a tab title, so they're dropped. */
export async function storefrontTabTitle(page: "menu" | "cart" | "history") {
  const t = await getTranslations("nav");
  return t(page).replace(/​/g, "");
}
