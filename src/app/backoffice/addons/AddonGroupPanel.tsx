"use client";

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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { addonGroupAvailability } from "@/app/lib/cart/addonSelection";
import { formatAmount } from "@/app/lib/orderFormat";
import { OWNER_ONLY_MESSAGE } from "@/app/lib/access/rolePolicy";
import { ASK_OWNER_HINTS } from "@/app/lib/access/permissions";
import { langAttr, type AppLocale } from "@/app/lib/i18n/locale";
import NameLanguageToggle from "@/app/components/NameLanguageToggle";
import { myanmarWordsOrNull } from "@/app/lib/i18n/customerWords";
import LocalizedName from "@/app/components/LocalizedName";
import { hasMissingMyanmarName } from "@/app/lib/i18n/myanmarNames";
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
  menus: { id: number; name: string }[];
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
}

/** "Latte, Mocha and Flat white" — menu names in a sentence. */
function listNames(names: readonly string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * One add-on group's quick settings — the same panel beside the list
 * (md and up) and in the drawer / bottom sheet below md: turn each option
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
}: AddonGroupPanelProps) {
  const { isBlocked } = addonGroupAvailability(group.isRequired, group.addons);
  const menuNames = group.menus.map((menu) => menu.name);
  // Which language the shop data names (group + options) show in — the
  // labels stay English. Resets per group (the panel is keyed by it).
  const [nameLocale, setNameLocale] = useState<AppLocale>("en");
  // မြန်မာ also shows the customer's money words ("1,000 ကျပ်",
  // "အခမဲ့"); EN keeps the Backoffice's "MMK" / "Free".
  const myanmarWords = myanmarWordsOrNull(nameLocale);
  const hasUntranslated =
    nameLocale === "my" && hasMissingMyanmarName(group, group.addons);

  return (
    <Box sx={{ p: 2, overflowY: "auto" }}>
      {/* Row 1: the title (wraps, takes the free width) + Edit (and the
          drawer's ×). Row 2: Required / Optional + the names' EN | မြန်မာ
          under Edit — so the toggle never squeezes the title. Both rows
          fit the 320px bottom sheet. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <Typography
          variant="h6"
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
        {isOwner && (
          <Button
            component={Link}
            href={`/backoffice/addons/${group.id}`}
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            sx={{ minHeight: 44, flexShrink: 0 }}
          >
            Edit
          </Button>
        )}
        {onClose && (
          <IconButton
            aria-label="Close"
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
        <RequiredChip isRequired={group.isRequired} />
        <NameLanguageToggle
          value={nameLocale}
          onChange={setNameLocale}
          ariaLabel="Show names in"
        />
      </Stack>

      {isBlocked && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          All options are off —{" "}
          {menuNames.length > 0
            ? `${listNames(menuNames)} can't be ordered right now.`
            : "nothing using this group can be ordered right now."}
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between", mt: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" id={`required-${group.id}-label`}>
            Required
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!isOwner
              ? OWNER_ONLY_MESSAGE
              : group.isRequired
                ? "Customers must choose one before adding to cart."
                : "Optional — customers can skip it."}
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

      <Typography variant="overline" color="text.secondary" component="h3">
        Options
      </Typography>
      {!canToggleAvailability && group.addons.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          {ASK_OWNER_HINTS.ADDON_AVAILABILITY}
        </Typography>
      )}
      {group.addons.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No options yet — add some on the Edit page.
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
                  variant="body2"
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
                    variant="caption"
                    color="text.secondary"
                    component="p"
                  >
                    Off · customers can&apos;t pick it
                  </Typography>
                )}
              </Box>
              {/* Money stays neutral (never red — DESIGN.md Rule 13). */}
              <Typography
                variant="body2"
                color={addon.price === 0 ? "text.secondary" : "text.primary"}
                lang={langAttr(nameLocale)}
                sx={{
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {addon.price === 0
                  ? (myanmarWords?.free ?? "Free")
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
                  input: { "aria-label": `${addon.name} available` },
                }}
              />
            </Stack>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="overline" color="text.secondary" component="h3">
        Used on {group.menus.length}{" "}
        {group.menus.length === 1 ? "menu" : "menus"}
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
              size="small"
              variant="outlined"
              label={
                <Typography variant="caption" component="span">
                  {menu.name}
                </Typography>
              }
            />
          ))}
        </Stack>
      )}

      {hasUntranslated && (
        <Typography
          variant="caption"
          component="p"
          color="text.secondary"
          sx={{ mt: 2 }}
        >
          Dotted names have no Myanmar name yet.
        </Typography>
      )}
    </Box>
  );
}
