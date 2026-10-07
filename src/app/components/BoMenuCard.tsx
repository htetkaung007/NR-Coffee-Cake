"use client";
import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  FormControlLabel,
  IconButton,
  Switch,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DoNotDisturbAltIcon from "@mui/icons-material/DoNotDisturbAlt";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { formatAmount } from "@/app/lib/orderFormat";
import { menuCardStatus } from "@/app/lib/menuCardStatus";
import { moneyToneSx } from "@/app/backoffice/order/orderTypography";
import MenuThumb from "./MenuThumb";
import type { StatusMessage } from "./StatusSnackbar";
import { useCan } from "./StaffAccessProvider";
import { ASK_OWNER_HINTS } from "@/app/lib/permissions";
import { setMenuAvailableAction } from "@/app/backoffice/menus/action";

/** Shape returned by MenuService.getMenusWithDetails — the only fields
 *  that actually exist across Menu + MenuCategory + MenuStock. */
export interface MenuCardData {
  id: number;
  name: string;
  price: number;
  description?: string;
  categories: string[];
  imageUrl: string | null;
  stockQuantity: number;
  isManuallyDisabled: boolean;
  /** Not shown at this location (an active DisableLocationMenus row) —
   *  changed only from the menu's form. */
  isHiddenHere: boolean;
}

interface MenuCardProps {
  item: MenuCardData;
  /** The owner, or a manager granted MENU_AVAILABILITY. Display only —
   *  setMenuAvailableAction checks it again. */
  canToggle: boolean;
  /** The selected location the switch acts on. */
  locationName: string;
  /** Reports the switch's outcome (the page shows one snackbar). */
  onNotify: (message: StatusMessage) => void;
}

/** Visually hidden but still read by screen readers. */
const SCREEN_READER_ONLY = {
  position: "absolute",
  width: 1,
  height: 1,
  m: -0.125,
  p: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/** The footer label hides (screen readers keep it) when the card itself
 *  is narrower than this — a container query, so the row never wraps. */
const NARROW_CARD = "@container (max-width: 219.95px)";
const HIDDEN_HERE_HINT =
  "Not shown at this location — change it in the menu's form (owner)";

export default function BOMenuCard({
  item,
  canToggle,
  locationName,
  onNotify,
}: MenuCardProps) {
  // Display only — the edit page and its action check the role too.
  const canEdit = useCan("owner");
  // The switch flips at once (optimistic) and falls back to the server's
  // value on its own if the action fails.
  const [isPending, startTransition] = useTransition();
  const [isSwitchedOn, setOptimisticSwitchedOn] = useOptimistic(
    !item.isManuallyDisabled,
  );
  // From the optimistic switch, so the card changes the moment it's
  // pressed.
  const status = menuCardStatus({
    stockQuantity: item.stockQuantity,
    isManuallyDisabled: !isSwitchedOn,
    isHiddenHere: item.isHiddenHere,
  });
  const hiddenHintId = `menu-${item.id}-hidden-hint`;
  // Hidden here: the switch would change nothing a customer sees, so
  // it's disabled with its own visible hint (below) instead.
  const permissionHint =
    canToggle || item.isHiddenHere ? "" : ASK_OWNER_HINTS.MENU_AVAILABILITY;

  function onToggle(nextOn: boolean) {
    startTransition(async () => {
      setOptimisticSwitchedOn(nextOn);
      const result = await setMenuAvailableAction({
        menuId: item.id,
        isAvailable: nextOn,
      });
      onNotify(
        result.success
          ? {
              text: nextOn
                ? `${item.name} is back on at ${locationName}`
                : `${item.name} is off at ${locationName}`,
              severity: "success",
            }
          : { text: result.error.message, severity: "error" },
      );
    });
  }
  const description = item.description ?? "";

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        // Lets the footer react to the card's own width (NARROW_CARD).
        containerType: "inline-size",
      }}
    >
      {/* Image — a short fixed ratio (capped on desktop) keeps the grid
          dense; the space is reserved, so nothing shifts on load. */}
      <Box
        sx={{
          position: "relative",
          aspectRatio: "16 / 10",
          maxHeight: { md: 140 },
          bgcolor: "background.default",
        }}
      >
        {/* The photo, or a first-letter tile when there's none or it
            fails to load. Only this area dims when the menu is switched
            off — the rest of the card stays full contrast. */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            filter: status === "unavailable" ? "grayscale(1)" : "none",
            opacity: status === "unavailable" ? 0.45 : 1,
            transition: "opacity 150ms ease-out, filter 150ms ease-out",
          }}
        >
          <MenuThumb
            name={item.name}
            imageUrl={item.imageUrl}
            alt={item.name}
          />
        </Box>
        <Chip
          label={
            <Typography variant="caption" component="span">
              {item.categories.join(", ")}
            </Typography>
          }
          size="small"
          sx={{
            position: "absolute",
            top: 4,
            left: 4,
            maxWidth: "calc(100% - 8px)",
            height: 20,
            bgcolor: "background.paper",
            color: "text.primary",
          }}
        />

        {/* Status in words, never colour alone (menuCardStatus). */}
        {status === "unavailable" && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                bgcolor: "background.paper",
                color: "text.primary",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <DoNotDisturbAltIcon fontSize="small" aria-hidden />
              <Typography variant="caption" component="span">
                Unavailable
              </Typography>
            </Box>
          </Box>
        )}
        {(status === "hidden" || status === "soldOut") && (
          <Chip
            label={
              <Typography variant="caption" component="span">
                {status === "hidden" ? "Hidden here" : "Sold out"}
              </Typography>
            }
            size="small"
            variant={status === "hidden" ? "outlined" : "filled"}
            sx={{
              position: "absolute",
              bottom: 4,
              right: 4,
              height: 20,
              // Sold out needs restocking (error role); error.dark keeps
              // white text ≥ 4.5:1 in both modes. Hidden here is neutral.
              ...(status === "hidden"
                ? { bgcolor: "background.paper", color: "text.primary" }
                : { bgcolor: "error.dark", color: "error.contrastText" }),
            }}
          />
        )}
      </Box>

      {/* Body: name → price → description (1 line) → "N left", with
          the footer pinned to the bottom so cards in a row line up. */}
      <CardContent
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          p: 1,
          "&:last-child": { pb: 0.5 },
        }}
      >
        {/* Phones: price on its own line under the name. From sm: name
            left, price right. */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "baseline" },
            justifyContent: "space-between",
            columnGap: 1,
          }}
        >
          <Typography
            variant="body1"
            title={item.name}
            sx={{
              flex: { sm: 1 },
              minWidth: 0,
              maxWidth: "100%",
              lineHeight: 1.3,
              color: "text.primary",
              // At most 2 lines, never broken inside a word.
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.name}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              ...moneyToneSx("price"),
              flexShrink: 0,
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatAmount(item.price)}
          </Typography>
        </Box>

        {description && (
          // One line at every width; the full text is in the title and on
          // the Edit page. nowrap + ellipsis works for Myanmar too (no
          // reliance on spaces).
          <Typography
            variant="body2"
            color="text.secondary"
            title={description}
            sx={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {description}
          </Typography>
        )}

        <Typography variant="body2" color="text.secondary">
          {Math.max(0, item.stockQuantity)} left
        </Typography>

        {item.isHiddenHere && (
          <Typography
            variant="caption"
            color="text.secondary"
            id={hiddenHintId}
          >
            {HIDDEN_HERE_HINT}
          </Typography>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Footer — one row: the switch (+ label) left, Edit right. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "nowrap",
            gap: 0.5,
            minWidth: 0,
          }}
        >
          {/* On/off at the selected location only. The span keeps the
              tooltip working while the switch is disabled. */}
          <Tooltip title={permissionHint}>
            <Box component="span" sx={{ minWidth: 0 }}>
              <FormControlLabel
                label={
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ [NARROW_CARD]: SCREEN_READER_ONLY }}
                  >
                    {isSwitchedOn ? "Available" : "Unavailable"}
                  </Typography>
                }
                control={
                  <Switch
                    checked={isSwitchedOn}
                    disabled={!canToggle || item.isHiddenHere || isPending}
                    onChange={(event) => onToggle(event.target.checked)}
                    slotProps={{
                      input: {
                        "aria-label": `${item.name} available at ${locationName}`,
                        "aria-describedby": item.isHiddenHere
                          ? hiddenHintId
                          : undefined,
                      },
                    }}
                  />
                }
                sx={{ minHeight: 44, m: 0, minWidth: 0, whiteSpace: "nowrap" }}
              />
            </Box>
          </Tooltip>

          {/* Editing a menu is the owner's (its page checks too). */}
          {canEdit && (
            <Tooltip title="Edit">
              <IconButton
                component={Link}
                href={`/backoffice/menus/${item.id}`}
                aria-label={`Edit ${item.name}`}
                sx={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  color: "text.primary",
                  [hoverCapableMedia]: {
                    "&:hover": { bgcolor: "action.hover" },
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
