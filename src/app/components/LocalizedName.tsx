"use client";

import { Box } from "@mui/material";
import { localizedText } from "@/app/lib/i18n/localizedText";

/** Whether `my` is missing (null or blank) — the English name shows. */
export function hasNoMyanmarName(my: string | null | undefined): boolean {
  return (my ?? "").trim() === "";
}

/**
 * A shop data name (group, option…) in `locale` (localizedText). With
 * `markUntranslated`, a Myanmar view of a name that has no Myanmar name
 * gets a dotted underline in the warning role — the Backoffice's "still
 * English here" hint (the Add-ons panel and the add-on group form's
 * "Customer sees" preview), never on a real customer screen.
 */
export default function LocalizedName({
  locale,
  en,
  my,
  markUntranslated = false,
}: {
  locale: string;
  en: string;
  my: string | null | undefined;
  markUntranslated?: boolean;
}) {
  const text = localizedText(locale, en, my);
  if (!markUntranslated || locale !== "my" || !hasNoMyanmarName(my)) {
    return <>{text}</>;
  }
  return (
    <Box
      component="span"
      sx={{
        textDecorationLine: "underline",
        textDecorationStyle: "dotted",
        textDecorationColor: (theme) => theme.palette.warning.main,
        textUnderlineOffset: "0.25em",
      }}
    >
      {text}
    </Box>
  );
}
