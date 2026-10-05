"use client";

import type { ReactNode } from "react";
import { Box, Button, GlobalStyles, Stack, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import type { ReportItems, ReportOverview } from "@/app/backoffice/reports/action";
import { formatAmount } from "@/app/lib/orderFormat";
import { formatRejectReasonCounts } from "@/app/lib/rejectReason";
import {
  barRatio,
  formatDelta,
  formatReportDay,
  printableReportTitle,
  REPORT_FOOTNOTE,
  type ItemListRow,
} from "@/app/lib/reportView";
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
        Print or save as PDF
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
        Choose &quot;Save as PDF&quot; as the printer to get a file.
      </Typography>
      <Button onClick={close} sx={{ minHeight: 44, alignSelf: { xs: "flex-start", sm: "auto" } }}>
        Close
      </Button>
    </Stack>
  );
}

/**
 * The printable weekly / monthly report: one A4 sheet (a month runs to
 * two pages at most), black on white, plain — for the owner. Every
 * figure is the Reports page's own (same service, same formatters):
 * money in plain black here, never green or red.
 */
export default function ReportSheet({
  locationName,
  generatedAt,
  overview,
  bestSellers,
  topAddons,
  reportsHref,
}: ReportSheetProps) {
  const { period, current, deltas } = overview;
  const { summary, daily, channels, cancelled } = current;
  const busiestDay = Math.max(0, ...daily.map((entry) => entry.sales));
  const reasons = formatRejectReasonCounts(cancelled.reasons);

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
            {printableReportTitle(period)}
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: MUTED }}>
            Generated {generatedAt} · {REPORT_FOOTNOTE}
          </Typography>
        </Box>

        <Section title="Key numbers">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 1,
            }}
          >
            <KeyNumber label="Sales" value={formatAmount(summary.sales)} />
            <KeyNumber label="Bills" value={String(summary.bills)} />
            <KeyNumber label="Avg. bill" value={formatAmount(summary.avgBill)} />
            <KeyNumber
              label="Sales vs previous period"
              value={formatDelta(deltas.sales, period.kind).label}
            />
            <KeyNumber
              label="Cancelled"
              value={`${cancelled.count} (${cancelled.rejected} rejected · ${cancelled.timedOut} timed out)`}
            />
            <KeyNumber label="Not charged" value={formatAmount(cancelled.notCharged)} />
          </Box>
        </Section>

        <Section title="Daily sales" keepTogether={false}>
          <Box component="table" sx={tableSx}>
            <thead>
              <tr>
                <Typography component="th" variant="caption" scope="col">
                  Date
                </Typography>
                <Typography component="th" variant="caption" scope="col">
                  Day
                </Typography>
                <Typography component="th" variant="caption" scope="col" className="number">
                  Bills
                </Typography>
                <Typography component="th" variant="caption" scope="col" className="number">
                  Sales
                </Typography>
                <Box component="th" aria-hidden sx={{ width: "30%" }} />
              </tr>
            </thead>
            <Typography component="tbody" variant="body2">
              {daily.map((entry) => {
                const [weekday, ...date] = formatReportDay(entry.day).split(" ");
                return (
                  <Box
                    component="tr"
                    key={entry.day}
                    sx={{ color: entry.sales === 0 ? ZERO_DAY : INK }}
                  >
                    <td>{date.join(" ")}</td>
                    <td>{weekday}</td>
                    <td className="number">{entry.bills}</td>
                    <td className="number">{formatAmount(entry.sales)}</td>
                    <td>
                      <DayBar ratio={barRatio(entry.sales, busiestDay)} />
                    </td>
                  </Box>
                );
              })}
              <Box component="tr" sx={{ ...moneySx, color: INK }}>
                <td>TOTAL</td>
                <td />
                <td className="number">{summary.bills}</td>
                <td className="number">{formatAmount(summary.sales)}</td>
                <td />
              </Box>
            </Typography>
          </Box>
        </Section>

        <Section title="Best sellers">
          {bestSellers.length === 0 ? (
            <Typography variant="body2" sx={{ color: MUTED }}>
              No items sold in this period.
            </Typography>
          ) : (
            <Box component="table" sx={tableSx}>
              <thead>
                <tr>
                  <Typography component="th" variant="caption" scope="col">
                    #
                  </Typography>
                  <Typography component="th" variant="caption" scope="col">
                    Item
                  </Typography>
                  <Typography component="th" variant="caption" scope="col" className="number">
                    Qty
                  </Typography>
                  <Typography component="th" variant="caption" scope="col" className="number">
                    Sales
                  </Typography>
                  <Typography component="th" variant="caption" scope="col" className="number">
                    Share
                  </Typography>
                </tr>
              </thead>
              <Typography component="tbody" variant="body2">
                {bestSellers.map((row) => (
                  <tr key={row.menuId}>
                    <td>{row.rank}</td>
                    <td>{row.name}</td>
                    <td className="number">{row.quantity}</td>
                    <td className="number">{formatAmount(row.itemSales)}</td>
                    <td className="number">{row.share}%</td>
                  </tr>
                ))}
              </Typography>
            </Box>
          )}
        </Section>

        <Section title="Top add-ons">
          {topAddons.length === 0 ? (
            <Typography variant="body2" sx={{ color: MUTED }}>
              No add-ons chosen in this period.
            </Typography>
          ) : (
            <Box component="table" sx={tableSx}>
              <thead>
                <tr>
                  <Typography component="th" variant="caption" scope="col">
                    Add-on
                  </Typography>
                  <Typography component="th" variant="caption" scope="col" className="number">
                    Times
                  </Typography>
                  <Typography component="th" variant="caption" scope="col" className="number">
                    Sales
                  </Typography>
                </tr>
              </thead>
              <Typography component="tbody" variant="body2">
                {topAddons.map((addon) => (
                  <tr key={addon.addonId}>
                    <td>{addon.name}</td>
                    <td className="number">{addon.timesChosen}</td>
                    <td className="number">{formatAmount(addon.addonSales)}</td>
                  </tr>
                ))}
              </Typography>
            </Box>
          )}
        </Section>

        <Section title="Order channels">
          <Box component="table" sx={tableSx}>
            <thead>
              <tr>
                <Typography component="th" variant="caption" scope="col">
                  Channel
                </Typography>
                <Typography component="th" variant="caption" scope="col" className="number">
                  Bills
                </Typography>
                <Typography component="th" variant="caption" scope="col" className="number">
                  Sales
                </Typography>
                <Typography component="th" variant="caption" scope="col" className="number">
                  Share
                </Typography>
              </tr>
            </thead>
            <Typography component="tbody" variant="body2">
              <tr>
                <td>Table</td>
                <td className="number">{channels.table.bills}</td>
                <td className="number">{formatAmount(channels.table.sales)}</td>
                <td className="number">{channels.tableShare}%</td>
              </tr>
              <tr>
                <td>Counter</td>
                <td className="number">{channels.counter.bills}</td>
                <td className="number">{formatAmount(channels.counter.sales)}</td>
                <td className="number">{channels.counterShare}%</td>
              </tr>
            </Typography>
          </Box>
        </Section>

        <Section title="Cancellations">
          <Box component="table" sx={tableSx}>
            <Typography component="tbody" variant="body2">
              <tr>
                <th scope="row">Rejected</th>
                <td className="number">{cancelled.rejected}</td>
              </tr>
              <tr>
                <th scope="row">Why rejected</th>
                <td className="number">{reasons || "—"}</td>
              </tr>
              <tr>
                <th scope="row">Timed out</th>
                <td className="number">{cancelled.timedOut}</td>
              </tr>
              <tr>
                <th scope="row">Not charged</th>
                <td className="number">{formatAmount(cancelled.notCharged)}</td>
              </tr>
            </Typography>
          </Box>
        </Section>
      </Box>
    </>
  );
}
