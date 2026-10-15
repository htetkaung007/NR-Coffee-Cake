import { Suspense } from "react";
import type { Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { SurfaceThemeProvider } from "@/app/lib/theme/ThemeModeProvider";
import { LOCALE_COOKIE } from "@/app/lib/i18n/locale";
import LanguageCard from "@/app/components/orderUI/LanguageCard";
import { CompanyService } from "@/app/services";
import HtmlLang from "@/app/components/orderUI/HtmlLang";
import { CustomerOrderUiLabels } from "@/app/components/orderUI/OrderUiLabels";
import OrderBotBar, { BottomBarProvider } from "@/app/components/orderUI/OrderBotBar";

/**
 * The customer pages draw edge to edge, so env(safe-area-inset-*) holds
 * the real insets on iPhones — without "cover" iOS reports them as 0 and
 * every "12px + safe area" bottom offset (the floating bottom bar, the
 * sheets' footers) ends up under the home indicator. The insets are
 * applied where the design says (DESIGN.md §19; body sides in the
 * customer theme's CssBaseline). Merged with Next's default
 * width=device-width, initial-scale=1.
 */
export const viewport: Viewport = {
  viewportFit: "cover",
};

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
          <BottomBarProvider>
            <CustomerOrderUiLabels>{children}</CustomerOrderUiLabels>
            {/* Menu / Cart / History — ONE bar for every tab page, so it
               stays put between them (lib/storefront/bottomBarVisibility
               decides where it shows). It reads the URL: Suspense keeps
               useSearchParams from opting the whole layout out. */}
            <Suspense fallback={null}>
              <OrderBotBar />
            </Suspense>
          </BottomBarProvider>
          <HtmlLang lang={locale} />
          <LanguageCard hasChosenLanguage={hasChosenLanguage} shopName={shopName} />
        </div>
      </NextIntlClientProvider>
    </SurfaceThemeProvider>
  );
}
