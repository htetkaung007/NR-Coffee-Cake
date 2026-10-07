"use client";

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
import { addonGroupAvailability } from "@/app/lib/addonSelection";
import { formatAmount } from "@/app/lib/orderFormat";
import { OWNER_ONLY_MESSAGE } from "@/app/lib/rolePolicy";
import RequiredChip from "./RequiredChip";

export interface AddonGroup {
  id: number;
  name: string;
  isRequired: boolean;
  addons: { id: number; name: string; price: number; isAvailable: boolean }[];
  /** This company's live menus using the group. */
  menus: { id: number; name: string }[];
}

interface AddonGroupPanelProps {
  group: AddonGroup;
  /** The signed-in user is an Admin (owner): may change Required and see
   *  Edit. Display only — the Server Action checks the session itself. */
  isOwner: boolean;
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
  pendingKeys,
  onToggleAddon,
  onToggleRequired,
  onClose,
}: AddonGroupPanelProps) {
  const { isBlocked } = addonGroupAvailability(group.isRequired, group.addons);
  const menuNames = group.menus.map((menu) => menu.name);

  return (
    <Box sx={{ p: 2, overflowY: "auto" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ overflowWrap: "anywhere" }}>
            {group.name}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <RequiredChip isRequired={group.isRequired} />
          </Box>
        </Box>
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
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {addon.name}
                </Typography>
                {!addon.isAvailable && (
                  <Typography variant="caption" color="text.secondary" component="p">
                    Off · customers can&apos;t pick it
                  </Typography>
                )}
              </Box>
              {/* Money stays neutral (never red — DESIGN.md Rule 13). */}
              <Typography
                variant="body2"
                color={addon.price === 0 ? "text.secondary" : "text.primary"}
                sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
              >
                {addon.price === 0 ? "Free" : formatAmount(addon.price)}
              </Typography>
              <Switch
                checked={addon.isAvailable}
                disabled={pendingKeys.has(`addon-${addon.id}`)}
                onChange={(event) => onToggleAddon(addon.id, event.target.checked)}
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
        Used on {group.menus.length} {group.menus.length === 1 ? "menu" : "menus"}
      </Typography>
      {group.menus.length > 0 && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}>
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
    </Box>
  );
}
