"use client";

import { useEffect } from "react";

/** Sets <html lang> to the customer's language while a storefront page
 *  is open (restored on leaving), so dialogs, sheets and snackbars —
 *  which MUI renders in a portal outside the layout's lang wrapper — are
 *  read in that language too. Renders nothing. */
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
