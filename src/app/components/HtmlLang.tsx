"use client";

import { useEffect } from "react";

/** Sets <html lang> to the surface's language while one of its pages is
 *  open (restored on leaving) — the customer's on the storefront, the
 *  staff's (BO_LOCALE) in the Backoffice, /print and sign-in — so
 *  dialogs, sheets, menus and snackbars, which MUI renders in a portal
 *  outside the layout's lang wrapper, get the language (and the
 *  :lang(my) typography) too. Renders nothing. */
export default function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang;
    return () => {
      root.lang = previous;
    };
  }, [lang]);
  return null;
}
