// next-intl type augmentation: the locales and the message keys (from
// messages/en.json) — a missing or misspelled key fails tsc.
import type en from "../../messages/en.json";
import type { AppLocale } from "@/app/lib/i18n/locale";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof en;
  }
}
