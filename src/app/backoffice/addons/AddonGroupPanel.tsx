"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { addonGroupAvailability } from "@/app/lib/cart/addonSelection";
import { useLocale } from "next-intl";
import { formatAmount } from "@/app/lib/orderFormat";
import { customerWords } from "@/app/lib/i18n/customerWords";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { langAttr, type AppLocale } from "@/app/lib/i18n/locale";
import NameLanguageToggle from "@/app/components/NameLanguageToggle";
import { myanmarWordsOrNull } from "@/app/lib/i18n/customerWords";
import LocalizedName from "@/app/components/LocalizedName";
import { hasMissingMyanmarName } from "@/app/lib/i18n/myanmarNames";
import { touchScreenQuery } from "@/app/lib/theme/sharedThemeTokens";
import RequiredChip from "./RequiredChip";

export interface AddonGroup {
  id: number;
  name: string;
  /** Its Myanmar name for customers (null = none). */
  nameMy: string | null;
  isRequired: boolean;
  addons: {
    id: number;
    name: string;
    nameMy: string | null;
    price: number;
    isAvailable: boolean;
  }[];
  /** This company's live menus using the group. */
  menus: { id: number; name: string; nameMy?: string | null }[];
}

interface AddonGroupPanelProps {
  group: AddonGroup;
  /** The signed-in user is an Admin (owner): may change Required and see
   *  Edit. Display only — the Server Action checks the session itself. */
  isOwner: boolean;
  /** The owner, or a manager granted ADDON_AVAILABILITY. Display only. */
  canToggleAvailability: boolean;
  /** A switch's request is in flight (its key: `addon-<id>` /
   *  `required-<id>`) — that switch is disabled meanwhile. */
  pendingKeys: ReadonlySet<string>;
  onToggleAddon: (addonId: number, isAvailable: boolean) => void;
  onToggleRequired: (isRequired: boolean) => void;
  /** In the drawer: its close (×). */
  onClose?: () => void;
  /** In the bottom sheet (below md): Edit moves from beside the × to a
   *  full-width button in a footer that stays in view while the panel
   *  scrolls. The inline panel (md+) keeps it in the header. */
  inSheet?: boolean;
}

/** The panel's text variants. Touch screens (phones, touch tablets — not
 *  laptops) get each one step bigger: theme variants, never font sizes,
 *  so the Myanmar :lang(my) rules (which target the variant) scale the
 *  bigger size too. */
const TEXT = {
  pointer: { title: "h6", body: "body2", small: "caption", section: "overline" },
  touch: { title: "h5", body: "body1", small: "body2", section: "body2" },
} as const;

/** "Latte, Mocha, and Flat white" — menu names in a sentence, in the
 *  staff's language (Intl.ListFormat). */
function listNames(names: readonly string[], locale: string) {
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
}

/**
 * One add-on group's quick settings — the same panel beside the list
 * (md and up) and in the bottom sheet below md (`inSheet`): turn each option
 * on or off (e.g. out of oat milk), and Required on or off (owner only).
 * Names, prices and options are changed on the Edit page. An off option
 * stays listed (the customer app shows it disabled, it doesn't hide it).
 */
export default function AddonGroupPanel({
  group,
  isOwner,
  canToggleAvailability,
  pendingKeys,
  onToggleAddon,
  onToggleRequired,
  onClose,
  inSheet = false,
}: AddonGroupPanelProps) {
  const t = useTranslations("bo.addons");
  const tCommon = useTranslations("bo.common");
  const tPermissions = useTranslations("bo.permissions");
  const locale = useLocale();
  const isTouch = useMediaQuery(touchScreenQuery);
  const text = isTouch ? TEXT.touch : TEXT.pointer;
  // A section label keeps its small-caps look in the bigger variant.
  const sectionSx = isTouch
    ? { textTransform: "uppercase", letterSpacing: "0.08em" }
    : undefined;
  const { isBlocked } = addonGroupAvailability(group.isRequired, group.addons);
  const menuNames = group.menus.map((menu) => localizedText(locale, menu.name, menu.nameMy));
  // Which language the shop data names (group + options) show in — the
  // labels follow the staff's Backoffice language. Resets per group (the
  // panel is keyed by it).
  const [nameLocale, setNameLocale] = useState<AppLocale>("en");
  // မြန်မာ also shows the customer's money words ("1,000 ကျပ်",
  // "အခမဲ့"); EN keeps "MMK" / "Free" (the English preview).
  const myanmarWords = myanmarWordsOrNull(nameLocale);
  const hasUntranslated =
    nameLocale === "my" && hasMissingMyanmarName(group, group.addons);

  const editButton = isOwner && (
    <Button
      component={Link}
      href={`/backoffice/addons/${group.id}`}
      variant="outlined"
      startIcon={<EditOutlinedIcon />}
      fullWidth={inSheet}
      sx={{ minHeight: 44, flexShrink: 0 }}
    >
      {t("edit")}
    </Button>
  );

  const body = (
    <>
      {/* Row 1: the title (wraps, takes the free width) + Edit (inline
          panel) or the sheet's × (its Edit is in the footer). Row 2:
          Required / Optional + the names' EN | မြန်မာ — so the toggle
          never squeezes the title. Both rows fit the 375px bottom sheet. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <Typography
          variant={text.title}
          component="h2"
          lang={langAttr(nameLocale)}
          sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}
        >
          <LocalizedName
            locale={nameLocale}
            en={group.name}
            my={group.nameMy}
            markUntranslated
          />
        </Typography>
        {!inSheet && editButton}
        {onClose && (
          <IconButton
            aria-label={tCommon("close")}
            onClick={onClose}
            sx={{ width: 44, height: 44, flexShrink: 0 }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "space-between", mt: 1 }}
      >
        <RequiredChip isRequired={group.isRequired} large={isTouch} />
        <NameLanguageToggle
          value={nameLocale}
          onChange={setNameLocale}
          ariaLabel={t("showNamesIn")}
        />
      </Stack>

      {isBlocked && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {menuNames.length > 0
            ? t("allOff", { menus: listNames(menuNames, locale) })
            : t("allOffNoMenus")}
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between", mt: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" id={`required-${group.id}-label`}>
            {t("required")}
          </Typography>
          <Typography variant={text.body} color="text.secondary">
            {!isOwner
              ? t("ownerOnly")
              : group.isRequired
                ? t("requiredHint")
                : t("optionalHint")}
          </Typography>
        </Box>
        <Switch
          checked={group.isRequired}
          disabled={!isOwner || pendingKeys.has(`required-${group.id}`)}
          onChange={(event) => onToggleRequired(event.target.checked)}
          slotProps={{
            input: { "aria-labelledby": `required-${group.id}-label` },
          }}
        />
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography
        variant={text.section}
        color="text.secondary"
        component="h3"
        sx={sectionSx}
      >
        {t("options")}
      </Typography>
      {!canToggleAvailability && group.addons.length > 0 && (
        <Typography variant={text.body} color="text.secondary">
          {tPermissions("askOwner.ADDON_AVAILABILITY")}
        </Typography>
      )}
      {group.addons.length === 0 ? (
        <Typography variant={text.body} color="text.secondary">
          {t("noOptions")}
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {group.addons.map((addon) => (
            <Stack
              component="li"
              key={addon.id}
              direction="row"
              spacing={2}
              sx={{
                alignItems: "center",
                minHeight: 48,
                "& + &": { borderTop: 1, borderColor: "divider" },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant={text.body}
                  color={addon.isAvailable ? "text.primary" : "text.secondary"}
                  lang={langAttr(nameLocale)}
                  sx={{ overflowWrap: "anywhere" }}
                >
                  <LocalizedName
                    locale={nameLocale}
                    en={addon.name}
                    my={addon.nameMy}
                    markUntranslated
                  />
                </Typography>
                {!addon.isAvailable && (
                  <Typography
                    variant={text.small}
                    color="text.secondary"
                    component="p"
                  >
                    {t("offHint")}
                  </Typography>
                )}
              </Box>
              {/* Money stays neutral (never red — DESIGN.md Rule 13). */}
              <Typography
                variant={text.body}
                color={addon.price === 0 ? "text.secondary" : "text.primary"}
                lang={langAttr(nameLocale)}
                sx={{
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {addon.price === 0
                  ? (myanmarWords ?? customerWords("en")).free
                  : (myanmarWords?.price(addon.price) ??
                    formatAmount(addon.price))}
              </Typography>
              <Switch
                checked={addon.isAvailable}
                disabled={
                  !canToggleAvailability || pendingKeys.has(`addon-${addon.id}`)
                }
                onChange={(event) =>
                  onToggleAddon(addon.id, event.target.checked)
                }
                slotProps={{
                  input: {
                    "aria-label": t("availableLabel", {
                      name: localizedText(nameLocale, addon.name, addon.nameMy),
                    }),
                  },
                }}
              />
            </Stack>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography
        variant={text.section}
        color="text.secondary"
        component="h3"
        sx={sectionSx}
      >
        {t("usedOn", { count: group.menus.length })}
      </Typography>
      {group.menus.length > 0 && (
        <Stack
          direction="row"
          useFlexGap
          sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}
        >
          {group.menus.map((menu) => (
            <Chip
              key={menu.id}
              // Touch: the medium chip, so the bigger label fits.
              size={isTouch ? "medium" : "small"}
              variant="outlined"
              label={
                <Typography variant={text.small} component="span">
                  {localizedText(locale, menu.name, menu.nameMy)}
                </Typography>
              }
            />
          ))}
        </Stack>
      )}

      {hasUntranslated && (
        <Typography
          variant={text.small}
          component="p"
          color="text.secondary"
          sx={{ mt: 2 }}
        >
          {t("dottedNames")}
        </Typography>
      )}
    </>
  );

  if (!inSheet) {
    return <Box sx={{ p: 2, overflowY: "auto" }}>{body}</Box>;
  }
  // The sheet: the body scrolls (a drag down closes the sheet only once
  // it's at the top — SidePanelDrawer swipeToClose); the Edit footer
  // stays in view above the safe area (the sheet's own bottom padding).
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
      }}
    >
      <Box sx={{ p: 2, overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
        {body}
      </Box>
      {editButton && (
        <Box
          sx={{
            flexShrink: 0,
            px: 2,
            pt: 1.5,
            pb: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          {editButton}
        </Box>
      )}
    </Box>
  );
}
