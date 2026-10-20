import { Chip, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import type { MenuCardStatus } from "@/app/lib/menu/menuCardStatus";

/** The words for each menuCardStatus — the Backoffice's one set
 *  (bo.menus). */
const MENU_STATUS_LABELS = {
  available: "available",
  unavailable: "unavailable",
  soldOut: "soldOut",
  hidden: "hiddenHere",
} as const satisfies Record<MenuCardStatus, string>;

/** Each ≥ 4.5:1 in light and dark: neutral on paper, except sold out —
 *  error.dark with white (error.main fails in dark mode). */
const STATUS_SX: Record<MenuCardStatus, SxProps<Theme>> = {
  available: { bgcolor: "background.paper", color: "text.primary" },
  unavailable: { bgcolor: "background.paper", color: "text.primary" },
  soldOut: { bgcolor: "error.dark", color: "error.contrastText" },
  hidden: { bgcolor: "background.paper", color: "text.primary" },
};

/** A menu's status at the selected location, in words (never colour
 *  alone) — the Backoffice menu card and the category dialog's list. */
export default function MenuStatusChip({
  status,
  sx,
}: {
  status: MenuCardStatus;
  sx?: SxProps<Theme>;
}) {
  const t = useTranslations("bo.menus");
  return (
    <Chip
      label={
        <Typography variant="caption" component="span">
          {t(MENU_STATUS_LABELS[status])}
        </Typography>
      }
      size="small"
      variant={status === "soldOut" ? "filled" : "outlined"}
      sx={[
        { height: 20, flexShrink: 0 },
        STATUS_SX[status],
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
