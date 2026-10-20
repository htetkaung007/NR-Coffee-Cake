import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type enMessages from "../../../messages/en.json";
import { staffClientMessages } from "@/app/lib/i18n/messageScopes";
import HtmlLang from "./HtmlLang";

/**
 * The staff surface's translations (Backoffice, /print, sign-in): the
 * language is BO_LOCALE (src/i18n/request.ts, via the proxy's surface
 * header), the client gets only the `bo.*` words. Everything inside
 * carries lang={locale} — and <html lang> follows while the page is open
 * (HtmlLang, for portalled menus and dialogs) — so the :lang(my)
 * typography (lib/theme/myanmarTypography) applies in Myanmar.
 */
export default async function StaffIntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = (await getMessages()) as typeof enMessages;
  return (
    <NextIntlClientProvider messages={staffClientMessages(messages)}>
      {/* display: contents — a lang boundary that adds no box. */}
      <div lang={locale} style={{ display: "contents" }}>
        {children}
        <HtmlLang lang={locale} />
      </div>
    </NextIntlClientProvider>
  );
}
