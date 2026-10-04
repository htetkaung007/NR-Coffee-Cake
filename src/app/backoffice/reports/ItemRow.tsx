"use client";

import type { ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { formatAmount } from "@/app/lib/orderFormat";
import type { ReportPeriodKind } from "@/app/lib/reportPeriod";
import type { ItemListRow } from "@/app/lib/reportView";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import ExpandedPanel, { RowChevron } from "./ExpandedPanel";
import ReportDelta from "./ReportDelta";
import { entryTitleSx, moneyToneSx } from "../order/orderTypography";

/** From sm: rank · item · sold · sales · share · change on one line. */
const SM_COLUMNS = "32px minmax(0, 1fr) 88px 128px 148px 96px 24px";

/** Phones: two lines — rank, name, sales; then sold · share · change. */
const ROW_GRID_SX = {
  display: "grid",
  alignItems: "center",
  columnGap: 1.5,
  rowGap: 0.5,
  px: { xs: 1.5, sm: 2 },
  gridTemplateColumns: { xs: "28px minmax(0, 1fr) auto 24px", sm: SM_COLUMNS },
  gridTemplateAreas: {
    xs: '"rank name sales chev" ". meta meta chev"',
    sm: '"rank name qty sales share delta chev"',
  },
} as const;

/** Column titles for the sm+ layout (phones label each value in words). */
export function ItemsListHeader() {
  const title = (text: string, area: string, align?: "right") => (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ gridArea: area, textAlign: align, textTransform: "uppercase" }}
    >
      {text}
    </Typography>
  );
  return (
    <Box
      aria-hidden
      sx={{
        ...ROW_GRID_SX,
        gridTemplateAreas: { sm: '"rank name qty sales share delta chev"' },
        display: { xs: "none", sm: "grid" },
        pb: 0.5,
      }}
    >
      {title("#", "rank")}
      {title("Item", "name")}
      {title("Sold", "qty")}
      {title("Sales", "sales", "right")}
      {title("Share", "share")}
      {title("Change", "delta", "right")}
    </Box>
  );
}

interface ItemRowProps {
  row: ItemListRow;
  /** The largest share in the list — the longest share bar is this. */
  maxShare: number;
  kind: ReportPeriodKind;
  /** The panel under the row (a menu's add-on pairing). With `onToggle`
   *  the whole row is a button — aria-expanded, a chevron — that opens it. */
  detail?: ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  /** The panel's id (what the button controls) and accessible name. */
  panelId?: string;
  panelLabel?: string;
}

/** One menu: rank · name · sold · sales · share (with a thin proportional
 *  bar) · change on the previous period. A menu with no sales says so in
 *  words. Money is text.primary, bold — never red. */
export default function ItemRow({
  row,
  maxShare,
  kind,
  detail,
  expanded = false,
  onToggle,
  panelId,
  panelLabel,
}: ItemRowProps) {
  const hasSales = row.quantity > 0 || row.itemSales > 0;
  const barWidth = maxShare > 0 ? (row.share / maxShare) * 100 : 0;

  return (
    <Box
      component="li"
      sx={{
        listStyle: "none",
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <RowHeader onToggle={onToggle} expanded={expanded} panelId={panelId}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ gridArea: "rank" }}
        >
          {row.rank}
        </Typography>
        <Typography
          variant="body1"
          noWrap
          sx={{ ...entryTitleSx, gridArea: "name" }}
        >
          {row.name}
        </Typography>

        {hasSales ? (
          <>
            <Typography
              variant="body1"
              sx={{
                ...moneyToneSx("income"),
                gridArea: "sales",
                textAlign: "right",
              }}
            >
              {formatAmount(row.itemSales)}
            </Typography>
            <Box
              sx={{
                gridArea: "meta",
                display: { xs: "flex", sm: "contents" },
                alignItems: "center",
                flexWrap: "wrap",
                columnGap: 1.5,
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ gridArea: "qty" }}
              >
                {row.quantity} sold
              </Typography>
              <Box
                sx={{
                  gridArea: "share",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: 0,
                  flex: { xs: "1 1 72px", sm: "none" },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ minWidth: 48, color: "text.primary" }}
                >
                  {row.share}%
                </Typography>
                <Box
                  aria-hidden
                  sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: "divider",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${barWidth}%`,
                      height: "100%",
                      bgcolor: "primary.main",
                    }}
                  />
                </Box>
              </Box>
              <Box sx={{ gridArea: "delta", textAlign: { sm: "right" } }}>
                <ReportDelta percent={row.deltaPercent} kind={kind} compact />
              </Box>
            </Box>
          </>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              gridArea: { xs: "meta" },
              gridRow: { sm: 1 },
              gridColumn: { sm: "qty-start / delta-end" },
            }}
          >
            No sales this period
          </Typography>
        )}
        {onToggle && (
          <Box sx={{ gridArea: "chev", display: "flex", justifyContent: "flex-end" }}>
            <RowChevron expanded={expanded} />
          </Box>
        )}
      </RowHeader>

      {expanded && detail && panelId && (
        <ExpandedPanel id={panelId} label={panelLabel ?? `${row.name} details`}>
          {detail}
        </ExpandedPanel>
      )}
    </Box>
  );
}

/** The row's grid, as a button when it can be expanded (a div with
 *  role="button" — it holds block content, which a <button> may not). */
function RowHeader({
  onToggle,
  expanded,
  panelId,
  children,
}: {
  onToggle?: () => void;
  expanded: boolean;
  panelId?: string;
  children: ReactNode;
}) {
  const grid = { ...ROW_GRID_SX, minHeight: 44, py: 1.5 };
  if (!onToggle) return <Box sx={grid}>{children}</Box>;
  return (
    <ButtonBase
      component="div"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={expanded ? panelId : undefined}
      sx={(theme) => ({
        ...grid,
        width: "100%",
        textAlign: "left",
        borderRadius: "inherit",
        [hoverCapableMedia]: {
          "&:hover": { backgroundColor: theme.palette.action.hover },
        },
        "&.Mui-focusVisible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2,
        },
      })}
    >
      {children}
    </ButtonBase>
  );
}
