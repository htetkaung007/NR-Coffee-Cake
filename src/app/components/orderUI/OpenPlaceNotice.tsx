"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { OpenPlaceNotice as Notice } from "@/app/lib/storefront/openOrderPlace";
import ScannedNotice from "./ScannedNotice";

/**
 * After a QR scan was sent back to the order place this phone already
 * has here (lib/storefront/openOrderPlace — one unpaid bill per phone
 * per location): a short note saying where the order is, in the same
 * short-lived style as "Scanned ✓". One-time — the `notice` flag is
 * dropped from the address, so a reload doesn't show it again.
 */
export default function OpenPlaceNotice({
  notice,
  placeName,
}: {
  notice: Notice | null;
  /** Table: its name ("Table 5" — shop data). Counter: the bill number. */
  placeName: string;
}) {
  const t = useTranslations("menu");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (!notice) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState(null, "", url);
  }, [notice]);

  if (!notice) return null;
  return (
    <ScannedNotice
      severity="info"
      closeLabel={tCommon("close")}
      message={
        notice === "atTable"
          ? t("alreadyAtTable", { table: placeName })
          : t("alreadyAtCounter", { number: placeName })
      }
    />
  );
}
