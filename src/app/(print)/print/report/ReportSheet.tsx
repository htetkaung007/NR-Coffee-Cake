"use client";

import type { ReactNode } from "react";
import { Box, Button, GlobalStyles, Stack, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import type { ReportItems, ReportOverview } from "@/app/backoffice/reports/action";
import { useLocale, useTranslations } from "next-intl";
import { formatRejectReasonCounts } from "@/app/lib/order/rejectReason";
import { formatVoidReasonCounts } from "@/app/lib/report/voidReport";
import {
  barRatio,
  formatDelta,
  printableReportTitle,
  type ItemListRow,
} from "@/app/lib/report/reportView";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import {
  useReasonCountLabels,
  useReportWords,
} from "@/app/backoffice/reports/useReportWords";
import { moneySx } from "@/app/backoffice/order/orderTypography";

// Paper is black on white whatever the app's light/dark mode (DESIGN.md
// Rule 13), so nothing here uses text.primary/secondary: those turn
// light in dark mode. Muted text is a grey that stays ≥ 4.5:1 on white.
const INK = "common.black";
const MUTED = "grey.700";
const ZERO_DAY = "grey.600";
const RULE = "grey.400";

interface ReportSheetProps {
  locationName: string;
  /** Already on the shop's clock ("Oct 5, 2026, 3:04 PM"). */
  generatedAt: string;
  overview: ReportOverview;
  /** Top 10, ranked as the Reports page ranks them. */
  bestSellers: ItemListRow[];
  /** Top 5, in the Add-ons card's order. */
  topAddons: ReportItems["addons"];
  /** Where Close goes when the tab can't close itself. */
  reportsHref: string;
}

/** Shared look of every table on the sheet: right-aligned tabular
 *  numbers, thin rules, real padding, and a header row that repeats on
 *  a new page (a <thead> does that by itself when printed). */
const tableSx = {
  width: "100%",
  borderCollapse: "collapse",
  // Tight rows: a 31-day month plus the other sections fits on two A4
  // pages (about 6.5mm a row).
  "& th, & td": {
    py: 0.25,
    px: 1,
    borderBottom: 1,
    borderColor: RULE,
    textAlign: "left",
    verticalAlign: "middle",
  },
  "& th": { color: MUTED },
  "& .number": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
  "& tr": { breakInside: "avoid" },
} as const;

function Section({
  title,
  keepTogether = true,
  children,
}: {
  title: string;
  /** Short sections never split across pages; the daily table may. */
  keepTogether?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      component="section"
      sx={{ mt: 3, ...(keepTogether && { breakInside: "avoid" }) }}
    >
      <Typography
        component="h2"
        variant="subtitle2"
        sx={{ mb: 1, color: INK, textTransform: "uppercase" }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** A printed table's header row (numbers right-aligned; `barColumn`
 *  adds the daily table's empty bar column). A <thead> repeats itself on
 *  a new page. */
function HeaderRow({
  columns,
  barColumn = false,
}: {
  columns: readonly { label: string; number?: boolean }[];
  barColumn?: boolean;
}) {
  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <Typography
            key={column.label}
            component="th"
            variant="caption"
            scope="col"
            className={column.number ? "number" : undefined}
          >
            {column.label}
          </Typography>
        ))}
        {barColumn && <Box component="th" aria-hidden sx={{ width: "30%" }} />}
      </tr>
    </thead>
  );
}

/** A titled two-column table of "label … value" rows (cancellations,
 *  voids). */
function FiguresSection({
  title,
  rows,
}: {
  title: string;
  rows: readonly (readonly [label: string, value: ReactNode])[];
}) {
  return (
    <Section title={title}>
      <Box component="table" sx={tableSx}>
        <Typography component="tbody" variant="body2">
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td className="number">{value}</td>
            </tr>
          ))}
        </Typography>
      </Box>
    </Section>
  );
}

function KeyNumber({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ border: 1, borderColor: RULE, borderRadius: 1, p: 1 }}>
      <Typography variant="caption" component="p" sx={{ color: MUTED }}>
        {label}
      </Typography>
      <Typography variant="body1" component="p" sx={{ ...moneySx, color: INK }}>
        {value}
      </Typography>
    </Box>
  );
}

/** A day's share of the busiest day, as an SVG bar — SVG fills print
 *  even when the browser leaves backgrounds off. */
function DayBar({ ratio }: { ratio: number }) {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      sx={{ display: "block", width: "100%", height: 8, color: MUTED }}
    >
      <rect width={ratio * 100} height="8" fill="currentColor" />
    </Box>
  );
}

/** The screen-only bar above the sheet: Print (the browser's own dialog,
 *  where "Save as PDF" is a printer) and Close. Hidden on paper. */
function Toolbar({ reportsHref }: { reportsHref: string }) {
  const t = useTranslations("bo.reports");
  function close() {
    window.close();
    // A tab the browser won't let a script close: go back instead.
    setTimeout(() => {
      if (!window.closed) window.location.href = reportsHref;
    }, 100);
  }

  return (
    <Stack
      className="no-print"
      direction={{ xs: "column", sm: "row" }}
      useFlexGap
      sx={{
        alignItems: { sm: "center" },
        gap: 1.5,
        maxWidth: "210mm",
        mx: "auto",
        px: 2,
        py: 2,
      }}
    >
      <Button
        variant="contained"
        startIcon={<PrintIcon />}
        onClick={() => window.print()}
        sx={{ minHeight: 44 }}
      >
        {t("printTitle")}
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
        {t("printHint")}
      </Typography>
      <Button onClick={close} sx={{ minHeight: 44, alignSelf: { xs: "flex-start", sm: "auto" } }}>
        {t("close")}
      </Button>
    </Stack>
  );
}

/**
 * The printable weekly / monthly report: one A4 sheet (a month runs to
 * two pages at most), black on white, plain — for the owner. Every
 * figure is the Reports page's own (same service, same formatters):
 * money in plain black here, never green or red. In the staff's language
 * (BO_LOCALE) — no switch of its own.
 */
export default function ReportSheet({
  locationName,
  generatedAt,
  overview,
  bestSellers,
  topAddons,
  reportsHref,
}: ReportSheetProps) {
  const t = useTranslations("bo.reports");
  const locale = useLocale();
  const words = useReportWords();
  const money = useStaffMoney();
  const reasonLabels = useReasonCountLabels();
  const { period, current, deltas } = overview;
  const { summary, daily, channels, cancelled, voided } = current;
  const busiestDay = Math.max(0, ...daily.map((entry) => entry.sales));
  const reasons = formatRejectReasonCounts(cancelled.reasons, reasonLabels.reject);
  const voidReasons = formatVoidReasonCounts(voided.reasons, reasonLabels.void);

  return (
    <>
      <GlobalStyles
        styles={(theme) => ({
          "@page": { size: "A4", margin: "12mm" },
          "@media print": {
            "html, body": {
              background: `${theme.palette.common.white} !important`,
            },
            ".no-print": { display: "none !important" },
          },
        })}
      />
      <Toolbar reportsHref={reportsHref} />

      <Box
        component="main"
        sx={{
          maxWidth: "210mm",
          mx: "auto",
          mb: 4,
          p: "12mm",
          bgcolor: "common.white",
          color: INK,
          // Screen only: the sheet sits on the page like paper.
          border: 1,
          borderColor: RULE,
          "@media print": { maxWidth: "none", m: 0, p: 0, border: 0 },
        }}
      >
        <Box component="header" sx={{ breakInside: "avoid" }}>
          <Typography variant="body2" component="p" sx={{ color: MUTED }}>
            {locationName}
          </Typography>
          <Typography variant="h6" component="h1" sx={{ color: INK }}>
            {printableReportTitle(period, words)}
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: MUTED }}>
            {t("generated", { time: generatedAt, footnote: t("footnote") })}
          </Typography>
        </Box>

        <Section title={t("keyNumbers")}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 1,
            }}
          >
            <KeyNumber label={t("sales")} value={money.amount(summary.sales)} />
            <KeyNumber label={t("billsLabel")} value={String(summary.bills)} />
            <KeyNumber label={t("avgBill")} value={money.amount(summary.avgBill)} />
            <KeyNumber
              label={t("salesVsPrevious")}
              value={formatDelta(deltas.sales, period.kind, words).label}
            />
            <KeyNumber
              label={t("cancelled")}
              value={t("cancelledBreakdown", {
                count: cancelled.count,
                rejected: cancelled.rejected,
                timedOut: cancelled.timedOut,
              })}
            />
            <KeyNumber label={t("notCharged")} value={money.amount(cancelled.notCharged)} />
          </Box>
        </Section>

        <Section title={t("dailySales")} keepTogether={false}>
          <Box component="table" sx={tableSx}>
            <HeaderRow barColumn columns={[{ label: t("colDate") }, { label: t("day") }, { label: t("billsLabel"), number: true }, { label: t("colSales"), number: true }]} />
            <Typography component="tbody" variant="body2">
              {daily.map((entry) => {
                return (
                  <Box
                    component="tr"
                    key={entry.day}
                    sx={{ color: entry.sales === 0 ? ZERO_DAY : INK }}
                  >
                    <td>{words.dayMonth(entry.day)}</td>
                    <td>{words.weekday(entry.day)}</td>
                    <td className="number">{entry.bills}</td>
                    <td className="number">{money.amount(entry.sales)}</td>
                    <td>
                      <DayBar ratio={barRatio(entry.sales, busiestDay)} />
                    </td>
                  </Box>
                );
              })}
              <Box component="tr" sx={{ ...moneySx, color: INK }}>
                <td>{t("totalCaps")}</td>
                <td />
                <td className="number">{summary.bills}</td>
                <td className="number">{money.amount(summary.sales)}</td>
                <td />
              </Box>
            </Typography>
          </Box>
        </Section>

        <Section title={t("bestSellers")}>
          {bestSellers.length === 0 ? (
            <Typography variant="body2" sx={{ color: MUTED }}>
              {t("noItemsSold")}
            </Typography>
          ) : (
            <Box component="table" sx={tableSx}>
              <HeaderRow columns={[{ label: "#" }, { label: t("colItem") }, { label: t("colQty"), number: true }, { label: t("colSales"), number: true }, { label: t("colShare"), number: true }]} />
              <Typography component="tbody" variant="body2">
                {bestSellers.map((row) => (
                  <tr key={row.menuId}>
                    <td>{row.rank}</td>
                    <td>{localizedText(locale, row.name, row.nameMy)}</td>
                    <td className="number">{row.quantity}</td>
                    <td className="number">{money.amount(row.itemSales)}</td>
                    <td className="number">{row.share}%</td>
                  </tr>
                ))}
              </Typography>
            </Box>
          )}
        </Section>

        <Section title={t("topAddons")}>
          {topAddons.length === 0 ? (
            <Typography variant="body2" sx={{ color: MUTED }}>
              {t("noAddonsChosen")}
            </Typography>
          ) : (
            <Box component="table" sx={tableSx}>
              <HeaderRow columns={[{ label: t("colAddon") }, { label: t("colTimes"), number: true }, { label: t("colSales"), number: true }]} />
              <Typography component="tbody" variant="body2">
                {topAddons.map((addon) => (
                  <tr key={addon.addonId}>
                    <td>{localizedText(locale, addon.name, addon.nameMy)}</td>
                    <td className="number">{addon.timesChosen}</td>
                    <td className="number">{money.amount(addon.addonSales)}</td>
                  </tr>
                ))}
              </Typography>
            </Box>
          )}
        </Section>

        <Section title={t("channelsTitle")}>
          <Box component="table" sx={tableSx}>
            <HeaderRow columns={[{ label: t("colChannel") }, { label: t("billsLabel"), number: true }, { label: t("colSales"), number: true }, { label: t("colShare"), number: true }]} />
            <Typography component="tbody" variant="body2">
              <tr>
                <td>{t("table")}</td>
                <td className="number">{channels.table.bills}</td>
                <td className="number">{money.amount(channels.table.sales)}</td>
                <td className="number">{channels.tableShare}%</td>
              </tr>
              <tr>
                <td>{t("counter")}</td>
                <td className="number">{channels.counter.bills}</td>
                <td className="number">{money.amount(channels.counter.sales)}</td>
                <td className="number">{channels.counterShare}%</td>
              </tr>
            </Typography>
          </Box>
        </Section>

        <FiguresSection
          title={t("cancellations")}
          rows={[
            [t("rejected"), cancelled.rejected],
            [t("whyRejected"), reasons || "—"],
            [t("timedOut"), cancelled.timedOut],
            [t("notCharged"), money.amount(cancelled.notCharged)],
            [t("withdrawnNotCounted"), cancelled.withdrawn],
          ]}
        />

        <FiguresSection
          title={t("voidedTitle")}
          rows={[
            [t("itemsVoided"), voided.count],
            [t("whyVoided"), voidReasons || "—"],
            [t("notCharged"), money.amount(voided.value)],
          ]}
        />
      </Box>
    </>
  );
}
