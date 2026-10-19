"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  ButtonBase,
  IconButton,
  Modal,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import { useLocale, useTranslations } from "next-intl";
import { setLocaleAction } from "@/app/(storefront)/language/action";
import {
  DEFAULT_LOCALE,
  LANGUAGE_NAMES,
  type AppLocale,
} from "@/app/lib/i18n/locale";
import { shopInitials } from "@/app/lib/storefront/shopInitials";

/** The pages it may appear on (and their sub-pages, e.g. a History
 *  receipt) — the menu, the cart with its outcome screens, the order
 *  history — plus the landing page `/` itself (exactly; it has no
 *  sub-pages of its own). Never the QR scan routes (Route Handlers that
 *  redirect here anyway) or anything else. */
const SHOWN_ON = ["/menu", "/cart", "/history"];

function isShownOn(pathname: string) {
  return (
    pathname === "/" ||
    SHOWN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  );
}

/** Rises into place once: opacity + transform only (DESIGN.md Part 1);
 *  the global reduced-motion rule makes it instant. */
const enter = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`;

/** Each option: its tile letter, and the caption naming it in the OTHER
 *  language (both bilingual on purpose). */
const OPTIONS: {
  locale: AppLocale;
  tile: string;
  caption: "myanmarCaption" | "englishCaption";
  captionLang: AppLocale;
}[] = [
  { locale: "my", tile: "က", caption: "myanmarCaption", captionLang: "en" },
  { locale: "en", tile: "A", caption: "englishCaption", captionLang: "my" },
];

/**
 * First visit on this device (no NEXT_LOCALE cookie yet — the server
 * says so through `hasChosenLanguage`): a compact floating card over the
 * dimmed page to pick မြန်မာ or English. Tapping an option sets the
 * cookie (setLocaleAction), refreshes so the page renders in it, and
 * closes. Closing any other way (×, Escape, a tap outside) keeps Myanmar,
 * the default — and still sets the cookie, so it never asks again. Fits
 * a 320×568 screen without scrolling.
 */
export default function LanguageCard({
  hasChosenLanguage,
  shopName,
}: {
  hasChosenLanguage: boolean;
  /** For the badge's initials — shop data, never translated. */
  shopName: string | null;
}) {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [, startSaving] = useTransition();

  const open = !hasChosenLanguage && !dismissed && isShownOn(pathname);
  const initials = shopInitials(shopName);

  function choose(next: AppLocale) {
    setDismissed(true);
    startSaving(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={() => choose(DEFAULT_LOCALE)}>
      <Box
        role="dialog"
        aria-labelledby="language-card-title"
        tabIndex={-1}
        sx={{
          position: "fixed",
          left: { xs: 12, sm: 16 },
          right: { xs: 12, sm: 16 },
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          mx: "auto",
          maxWidth: 400,
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 8,
          p: 2,
          outline: "none",
          animation: `${enter} 220ms ease-out`,
        }}
      >
        <IconButton
          aria-label={t("close")}
          onClick={() => choose(DEFAULT_LOCALE)}
          sx={{ position: "absolute", top: 4, right: 4, width: 44, height: 44 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Stack sx={{ alignItems: "center", textAlign: "center", mb: 2 }}>
          {initials && (
            <Box
              aria-hidden
              sx={{
                // Grows with the initials (never a fixed size).
                minWidth: 40,
                minHeight: 40,
                px: 0.5,
                mb: 1,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              <Typography component="span" variant="subtitle2" sx={{ fontWeight: 700 }}>
                {initials}
              </Typography>
            </Box>
          )}
          <Typography
            id="language-card-title"
            component="h2"
            variant="subtitle1"
            lang="my"
            sx={{ fontWeight: 700 }}
          >
            {t("title")}
          </Typography>
          <Typography variant="caption" color="text.secondary" lang="en">
            {t("subtitle")}
          </Typography>
        </Stack>

        <Stack role="radiogroup" aria-labelledby="language-card-title" spacing={1}>
          {OPTIONS.map((option) => {
            const selected = option.locale === locale;
            return (
              <ButtonBase
                key={option.locale}
                role="radio"
                aria-checked={selected}
                onClick={() => choose(option.locale)}
                sx={(theme) => ({
                  width: "100%",
                  minHeight: 56,
                  px: 1.5,
                  py: 1,
                  gap: 1.5,
                  justifyContent: "flex-start",
                  textAlign: "left",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: selected ? "primary.main" : "divider",
                  // The selected row's 2px edge without moving anything.
                  boxShadow: selected
                    ? `inset 0 0 0 1px ${theme.palette.primary.main}`
                    : "none",
                  "&.Mui-focusVisible": {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                  },
                })}
              >
                <Box
                  component="span"
                  aria-hidden
                  sx={(theme) => ({
                    minWidth: 36,
                    minHeight: 36,
                    px: 0.5,
                    flexShrink: 0,
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: "primary.main",
                  })}
                >
                  <Typography component="span" variant="body1" sx={{ fontWeight: 600 }}>
                    {option.tile}
                  </Typography>
                </Box>
                <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    component="span"
                    variant="body1"
                    lang={option.locale}
                    sx={{ display: "block", fontWeight: 600 }}
                  >
                    {LANGUAGE_NAMES[option.locale]}
                  </Typography>
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    lang={option.captionLang}
                    sx={{ display: "block" }}
                  >
                    {t(option.caption)}
                  </Typography>
                </Box>
                {selected ? (
                  <CheckCircleIcon aria-hidden sx={{ color: "primary.main", flexShrink: 0 }} />
                ) : (
                  <RadioButtonUncheckedIcon
                    aria-hidden
                    sx={{ color: "text.disabled", flexShrink: 0 }}
                  />
                )}
              </ButtonBase>
            );
          })}
        </Stack>

        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center", justifyContent: "center", mt: 2 }}
        >
          <LanguageOutlinedIcon aria-hidden sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary">
            <span lang="my">{t("footerMy")}</span> · <span lang="en">{t("footerEn")}</span>
          </Typography>
        </Stack>
      </Box>
    </Modal>
  );
}
