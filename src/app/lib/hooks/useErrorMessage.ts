"use client";

import { useTranslations } from "next-intl";
import { customerErrorMessage } from "@/app/lib/i18n/errorMessage";

/** A customer screen's way to show an action error: in the customer's
 *  language, by its code (lib/i18n/errorMessage). Storefront only. */
export function useErrorMessage() {
  const t = useTranslations("errors");
  return (error: { code: string; params?: Record<string, string | number> }) =>
    customerErrorMessage(error, (key, values) => t(key, values));
}
