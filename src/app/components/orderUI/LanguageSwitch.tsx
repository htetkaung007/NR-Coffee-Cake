"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Box, Button } from "@mui/material";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import { setLocaleAction } from "@/app/(storefront)/language/action";
import {
  LANGUAGE_NAMES,
  SHORT_LANGUAGE_NAMES,
  type AppLocale,
} from "@/app/lib/i18n/locale";

/** Switches to the OTHER language — a globe and that language's short
 *  label ("EN" while the page is Myanmar, "မြန်မာ" while it's English),
 *  at every width (the page is never narrower than 375px). Sets the
 *  cookie, then refreshes so the server renders the page in it. Never
 *  shrinks — the shop name gives way instead. The customer top bar
 *  (OrderTopBar) and the landing page (`/`) share it. */
export default function LanguageSwitch() {
  const t = useTranslations("topBar");
  const router = useRouter();
  const locale = useLocale();
  const [isSaving, startSaving] = useTransition();
  const other: AppLocale = locale === "my" ? "en" : "my";

  return (
    <Button
      size="small"
      color="inherit"
      aria-label={`${t("changeLanguage")}, ${LANGUAGE_NAMES[other]}`}
      disabled={isSaving}
      onClick={() =>
        startSaving(async () => {
          await setLocaleAction(other);
          router.refresh();
        })
      }
      sx={{
        minHeight: 44,
        minWidth: 44,
        px: 1,
        gap: 0.5,
        flexShrink: 0,
        color: "text.primary",
      }}
    >
      <LanguageOutlinedIcon aria-hidden fontSize="small" />
      <Box component="span" lang={other}>
        {SHORT_LANGUAGE_NAMES[other]}
      </Box>
    </Button>
  );
}
