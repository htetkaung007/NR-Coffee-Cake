import { useCallback } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { staffMoney } from "@/app/lib/i18n/staffMoney";
import { staffErrorMessage } from "@/app/lib/i18n/staffErrorMessage";

/* No "use client": next-intl's hooks work in Server Components too, so
 * shared staff markup (BillLineRows, the printed receipt) can call these
 * wherever it renders. */

/** Money in the staff's language: "4,500 MMK" / "4,500 ကျပ်"
 *  (lib/i18n/staffMoney). Staff surface only (Backoffice, /print). */
export function useStaffMoney() {
  return staffMoney(useTranslations("bo.money"));
}

/** A staff screen's way to show an action error: the server's English
 *  message in English, the code's words in Myanmar
 *  (lib/i18n/staffErrorMessage). Staff surface only. Stable while the
 *  language is (safe in effect / callback dependencies). */
export function useStaffErrorMessage() {
  const locale = useLocale();
  const t = useTranslations("bo.errors");
  return useCallback(
    (error: {
      message: string;
      code: string;
      params?: Record<string, string | number>;
    }) => staffErrorMessage(error, locale, (key, values) => t(key, values)),
    [locale, t],
  );
}

/** The staff's generic error — what a thrown Server Action (a network
 *  drop, no Result at all) shows, in the staff's language. */
export function useStaffGenericError() {
  return useTranslations("bo.errors")("generic");
}

/** A time of day on staff screens — "11:20 AM" / Myanmar's own — in the
 *  SHOP timezone (next-intl's formatter: src/i18n/request.ts), never the
 *  device's; digits 0–9 in both languages, as money (numberingSystem
 *  latn — Intl's Myanmar default is ၀–၉). Takes the ISO time the server
 *  sent. */
export function useClockTime() {
  const format = useFormatter();
  return (isoTime: string) =>
    format.dateTime(new Date(isoTime), { hour: "numeric", minute: "2-digit", numberingSystem: "latn" });
}
