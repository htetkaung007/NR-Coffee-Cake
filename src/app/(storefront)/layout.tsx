import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { SurfaceThemeProvider } from "@/app/lib/theme/ThemeModeProvider";
import { LOCALE_COOKIE } from "@/app/lib/i18n/locale";
import LanguageCard from "@/app/components/orderUI/LanguageCard";
import { CompanyService } from "@/app/services";
import HtmlLang from "@/app/components/orderUI/HtmlLang";
import { CustomerOrderUiLabels } from "@/app/components/orderUI/OrderUiLabels";

/**
 * The customer side: the customer theme and the customer's language
 * (next-intl, from the NEXT_LOCALE cookie — src/i18n/request.ts). The
 * translations provider lives only here, never in the root or Backoffice
 * layout. Everything inside carries lang={locale}, so screen readers read
 * Burmese as Burmese (the root <html lang> is "en" for the Backoffice).
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  // No cookie yet = first visit on this device: offer the language sheet.
  const hasChosenLanguage = (await cookies()).has(LOCALE_COOKIE);
  // The card's badge initials — read only when the card may show.
  const shopName = hasChosenLanguage ? null : await CompanyService.getShopName();

  return (
    <SurfaceThemeProvider surface="od">
      <NextIntlClientProvider>
        {/* display: contents — a lang boundary that adds no box to the
           layout (pages size themselves against <body>). */}
        <div lang={locale} style={{ display: "contents" }}>
          {/* The words of the order parts shared with the Backoffice
             (menu detail, line notices), in the customer's language. */}
          <CustomerOrderUiLabels>{children}</CustomerOrderUiLabels>
          <HtmlLang lang={locale} />
          <LanguageCard hasChosenLanguage={hasChosenLanguage} shopName={shopName} />
        </div>
      </NextIntlClientProvider>
    </SurfaceThemeProvider>
  );
}
