"use client";

import type { ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import type { ReportPeriodKind } from "@/app/lib/report/reportPeriod";
import type { ItemListRow } from "@/app/lib/report/reportView";
import type { ViewFunnel } from "@/app/lib/report/viewFunnel";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import ExpandedPanel, { RowChevron } from "./ExpandedPanel";
import ReportDelta from "./ReportDelta";
import { entryTitleSx, moneyToneSx } from "../order/orderTypography";

/** From sm: rank · item · sold · sales · share · change on one line. */
const SM_COLUMNS = "32px minmax(0, 1fr) 88px 128px 148px 96px 24px";

/** Phones: rank, name, sales; then sold · share · change. Every width
 *  ends with the view funnel's line (Viewers · Ordered · …), which wraps
 *  inside the row — never sideways. */
const ROW_GRID_SX = {
  display: "grid",
  alignItems: "center",
  columnGap: 1.5,
  rowGap: 0.5,
  px: { xs: 1.5, sm: 2 },
  gridTemplateColumns: { xs: "28px minmax(0, 1fr) auto 24px", sm: SM_COLUMNS },
  gridTemplateAreas: {
    xs: '"rank name sales chev" ". meta meta chev" ". funnel funnel chev"',
    sm: '"rank name qty sales share delta chev" ". funnel funnel funnel funnel funnel chev"',
  },
} as const;

/** Column titles for the sm+ layout (phones label each value in words). */
export function ItemsListHeader() {
  const t = useTranslations("bo.reports");
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
      {title(t("colItem"), "name")}
      {title(t("colSold"), "qty")}
      {title(t("colSales"), "sales", "right")}
      {title(t("colShare"), "share")}
      {title(t("colChange"), "delta", "right")}
    </Box>
  );
}

interface ItemRowProps {
  row: ItemListRow;
  /** The largest share in the list — the longest share bar is this. */
  maxShare: number;
  kind: ReportPeriodKind;
  /** Customers who opened / ordered this menu in the period
   *  (lib/report/viewFunnel) — counts only, neutral, "—" when the period
   *  has no view data. */
  funnel?: ViewFunnel;
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
  funnel,
  detail,
  expanded = false,
  onToggle,
  panelId,
  panelLabel,
}: ItemRowProps) {
  const t = useTranslations("bo.reports");
  const locale = useLocale();
  const money = useStaffMoney();
  const name = localizedText(locale, row.name, row.nameMy);
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
          {name}
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
              {money.amount(row.itemSales)}
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
                {t("sold", { count: row.quantity })}
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
            {t("noSalesPeriod")}
          </Typography>
        )}
        {funnel && <FunnelLine funnel={funnel} />}
        {onToggle && (
          <Box sx={{ gridArea: "chev", display: "flex", justifyContent: "flex-end" }}>
            <RowChevron expanded={expanded} />
          </Box>
        )}
      </RowHeader>

      {expanded && detail && panelId && (
        <ExpandedPanel id={panelId} label={panelLabel ?? t("rowDetails", { name })}>
          {detail}
        </ExpandedPanel>
      )}
    </Box>
  );
}

/** Viewers · Ordered · Viewed, not ordered · Rate — each value named in
 *  words (no column titles), wrapping onto more lines when narrow. Counts
 *  and percentages are neutral (text.primary), never the income tone. */
function FunnelLine({ funnel }: { funnel: ViewFunnel }) {
  const t = useTranslations("bo.reports");
  const shown = (value: number | null, suffix = "") =>
    value === null ? "—" : `${value}${suffix}`;
  const items: [string, string][] = [
    [t("viewers"), shown(funnel.viewers)],
    [t("orderers"), shown(funnel.orderers)],
    [t("viewedNotOrdered"), shown(funnel.viewedNotOrdered)],
    [t("orderRate"), shown(funnel.rate, "%")],
  ];
  return (
    <Box
      sx={{
        gridArea: "funnel",
        display: "flex",
        flexWrap: "wrap",
        columnGap: 2,
        rowGap: 0.5,
        minWidth: 0,
      }}
    >
      {items.map(([label, value]) => (
        <Typography key={label} variant="body2" color="text.secondary">
          {label}{" "}
          <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
            {value}
          </Box>
        </Typography>
      ))}
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
