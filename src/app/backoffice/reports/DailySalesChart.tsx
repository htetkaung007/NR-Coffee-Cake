"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  Fade,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  countLabel,
  CURRENCY_LABEL,
  formatAmount,
  formatCompactAmount,
} from "@/app/lib/orderFormat";
import { periodLabel, type ReportPeriod } from "@/app/lib/reportPeriod";
import {
  axisLabelIndexes,
  barLabel,
  barRatio,
  chartTicks,
  formatReportDay,
  niceMax,
  progressCaption,
} from "@/app/lib/reportView";
import {
  hoverCapableMedia,
  visuallyHiddenSx,
} from "@/app/lib/theme/sharedThemeTokens";
import type { ReportOverview } from "./action";
import {
  moneyColor,
  moneyToneSx,
  sectionHeadingSx,
} from "../order/orderTypography";

type DailySales = ReportOverview["current"]["daily"][number];

// ── Motion (DESIGN.md Part 1) ───────────────────────────────────────────
// The bars grow from the baseline ONCE, the first time the chart shows;
// after that a period switch is just a short fade — never a redraw.
// transform + opacity only; starts at 4% (not 0 — Rule 3 forbids
// scale(0)); ease-out; the stagger is capped at 20ms a bar so even 31
// bars are done within ~0.8s.
const drawBar = keyframes`
  from { transform: scaleY(0.04); opacity: 0; }
  to { transform: scaleY(1); opacity: 1; }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const DRAW_MS = 360;
const MAX_STAGGER_MS = 20;
const TOTAL_STAGGER_MS = 400;
const CROSSFADE_MS = 150;
const TOOLTIP_MS = 150;
const TABLE_FADE_MS = { enter: 180, exit: 120 };

/** The "View as table" box shows about 10 rows, then scrolls itself. */
const TABLE_MAX_HEIGHT = 360;

const PLOT_HEIGHT = { xs: 160, sm: 200 };
const AXIS_WIDTH = 40;

/** Where a bar leads: that day's paid bills in Order History. */
const historyHref = (day: string) =>
  `/backoffice/order/history?day=${day}&tab=paid`;

interface DailySalesChartProps {
  period: ReportPeriod;
  daily: DailySales[];
  today: string;
}

/**
 * Sales per day of the period as bars — plain HTML/CSS, no chart library.
 * Zero days are there too (a short stub). Each bar is a real link to that
 * day's bills: keyboard-focusable, labelled "Mon 28 Sep: 142,000 MMK, 12
 * bills"; a visually-hidden table is the text equivalent of the whole
 * chart (and "View as table" shows one on screen). A week's bars carry
 * their sales ("24.4k") above and their bill count below; a month's
 * 28–31 bars don't (they'd collide) — the tooltip has it all. Today's
 * bar is outlined (and says so), not just coloured.
 *
 * Hover and keyboard focus show a tooltip. On touch the bars are thin
 * (31 in a month), so a first tap only previews that day and a second tap
 * on the same bar opens it.
 */
export default function DailySalesChart({
  period,
  daily,
  today,
}: DailySalesChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // True until the first draw has finished — from then on, no animation.
  const [isFirstDraw, setIsFirstDraw] = useState(true);
  const chartRef = useRef<HTMLDivElement | null>(null);
  // The last pointer was a finger — decides tap behaviour and the hint.
  const [isTouch, setIsTouch] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const tableId = useId();

  useEffect(() => {
    const timeout = setTimeout(
      () => setIsFirstDraw(false),
      DRAW_MS + TOTAL_STAGGER_MS + 100,
    );
    return () => clearTimeout(timeout);
  }, []);

  // A tap outside the chart puts the touch tooltip away.
  useEffect(() => {
    if (activeIndex === null) return;
    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType !== "touch") return;
      if (!chartRef.current?.contains(event.target as Node)) {
        setActiveIndex(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeIndex]);

  const max = niceMax(Math.max(0, ...daily.map((entry) => entry.sales)));
  const ticks = chartTicks(max);
  const labelled = new Set(axisLabelIndexes(daily.length, period.kind));
  const caption = progressCaption(period, today);
  const isDense = daily.length > 8;
  const isWeek = period.kind === "week";
  const stagger = Math.min(MAX_STAGGER_MS, TOTAL_STAGGER_MS / daily.length);
  const active = activeIndex === null ? null : daily[activeIndex];
  const tooltipPercent =
    activeIndex === null ? 0 : ((activeIndex + 0.5) / daily.length) * 100;

  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="body1" component="h2" sx={sectionHeadingSx}>
          Daily sales
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        )}
      </Stack>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Sales ({CURRENCY_LABEL})
        </Typography>
        {caption && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Box
              aria-hidden
              sx={{
                width: 10,
                height: 10,
                border: 2,
                borderColor: "text.primary",
                borderRadius: "2px",
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Today
            </Typography>
          </Stack>
        )}
      </Stack>

      <Box ref={chartRef}>
        {/* Keyed by the period, so a new one fades in (never redraws). */}
        <Box
          key={period.startDay}
          sx={{
            display: "grid",
            gridTemplateColumns: `${AXIS_WIDTH}px minmax(0, 1fr)`,
            // Room above the tallest bar for its value label.
            mt: isWeek ? 2 : 0,
            animation: `${fadeIn} ${CROSSFADE_MS}ms ease-out`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        >
          <Box aria-hidden>
            {/* Scale labels, level with their gridlines. */}
            <Box sx={{ position: "relative", height: PLOT_HEIGHT, pr: 1 }}>
              {ticks.map((tick) => (
                <Typography
                  key={tick}
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    position: "absolute",
                    right: 8,
                    bottom: `${barRatio(tick, max) * 100}%`,
                    transform: "translateY(50%)",
                    lineHeight: 1,
                  }}
                >
                  {formatCompactAmount(tick)}
                </Typography>
              ))}
            </Box>
            {/* Week: names the bill-count line under the day labels (two
             caption lines down, level with it). */}
            {isWeek && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 0.5,
                  pr: 1,
                  textAlign: "right",
                  lineHeight: 1.3,
                }}
              >
                <Box component="span" sx={{ display: "block" }}>
                  &nbsp;
                </Box>
                <Box component="span" sx={{ display: "block" }}>
                  &nbsp;
                </Box>
                Bills
              </Typography>
            )}
          </Box>

          <Box sx={{ position: "relative", minWidth: 0 }}>
            <Box sx={{ position: "relative", height: PLOT_HEIGHT }}>
              {ticks.map((tick) => (
                <Box
                  key={tick}
                  aria-hidden
                  sx={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: `${barRatio(tick, max) * 100}%`,
                    borderTop: 1,
                    borderColor: "divider",
                    borderStyle: tick === 0 ? "solid" : "dashed",
                  }}
                />
              ))}

              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "stretch",
                }}
              >
                {daily.map((entry, index) => {
                  const isToday = entry.day === today;
                  const isActive = activeIndex === index;
                  return (
                    <Box
                      key={entry.day}
                      component={Link}
                      href={historyHref(entry.day)}
                      prefetch={false}
                      aria-label={barLabel(entry, isToday)}
                      onPointerDown={(event) => {
                        setIsTouch(event.pointerType === "touch");
                      }}
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse")
                          setActiveIndex(index);
                      }}
                      onPointerLeave={(event) => {
                        if (event.pointerType === "mouse") setActiveIndex(null);
                      }}
                      onFocus={(event) => {
                        // Keyboard focus only — a tap also focuses, and
                        // that must not count as the "first tap".
                        if (event.currentTarget.matches(":focus-visible")) {
                          setActiveIndex(index);
                        }
                      }}
                      onBlur={() => setActiveIndex(null)}
                      onClick={(event) => {
                        if (isTouch && activeIndex !== index) {
                          event.preventDefault();
                          setActiveIndex(index);
                        }
                      }}
                      sx={{
                        position: "relative",
                        flex: "1 1 0",
                        minWidth: 0,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        px: isDense ? 0.25 : 1,
                        outline: "none",
                        "&:focus-visible .bar-frame": {
                          outline: "2px solid",
                          outlineColor: "primary.main",
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <Box
                        className="bar-frame"
                        aria-hidden
                        sx={{
                          width: "100%",
                          maxWidth: 40,
                          height: `${barRatio(entry.sales, max) * 100}%`,
                          minHeight: 2,
                          borderRadius: "4px 4px 0 0",
                          bgcolor:
                            entry.sales === 0
                              ? "divider"
                              : isActive
                                ? "primary.dark"
                                : "primary.main",
                          // Today: an outline, so it isn't colour alone.
                          outline: isToday ? "2px solid" : "none",
                          outlineColor: "text.primary",
                          outlineOffset: 1,
                          transformOrigin: "bottom",
                          transition: "background-color 150ms ease",
                          ...(isFirstDraw && {
                            animation: `${drawBar} ${DRAW_MS}ms ease-out both`,
                            animationDelay: `${index * stagger}ms`,
                            "@media (prefers-reduced-motion: reduce)": {
                              animation: "none",
                            },
                          }),
                          [hoverCapableMedia]: {
                            "a:hover &": {
                              bgcolor:
                                entry.sales === 0 ? "divider" : "primary.dark",
                            },
                          },
                        }}
                      />
                      {isWeek && entry.sales > 0 && (
                        <Typography
                          variant="caption"
                          component="span"
                          aria-hidden
                          sx={{
                            position: "absolute",
                            left: "50%",
                            bottom: `${barRatio(entry.sales, max) * 100}%`,
                            transform: "translateX(-50%)",
                            mb: 0.5,
                            lineHeight: 1.3,
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                            color: moneyColor("income"),
                            // First draw: appears once its bar has grown.
                            ...(isFirstDraw && {
                              animation: `${fadeIn} ${CROSSFADE_MS}ms ease-out both`,
                              animationDelay: `${index * stagger + DRAW_MS}ms`,
                              "@media (prefers-reduced-motion: reduce)": {
                                animation: "none",
                              },
                            }),
                          }}
                        >
                          {formatCompactAmount(entry.sales)}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Day labels: every day of a week, every 5th of a month. */}
            <Box aria-hidden sx={{ display: "flex", mt: 0.5, minHeight: 32 }}>
              {daily.map((entry, index) => {
                const isToday = entry.day === today;
                const [weekday] = formatReportDay(entry.day).split(" ");
                return (
                  <Box
                    key={entry.day}
                    sx={{
                      flex: "1 1 0",
                      minWidth: 0,
                      textAlign: "center",
                      color: "text.secondary",
                    }}
                  >
                    {labelled.has(index) && (
                      <Typography
                        variant="caption"
                        component="span"
                        sx={{
                          display: "block",
                          lineHeight: 1.3,
                          color: isToday ? "text.primary" : "text.secondary",
                          fontWeight: isToday ? 700 : undefined,
                          textDecoration: isToday ? "underline" : "none",
                        }}
                      >
                        {isWeek && (
                          <Box component="span" sx={{ display: "block" }}>
                            {weekday}
                          </Box>
                        )}
                        {Number(entry.day.slice(8))}
                      </Typography>
                    )}
                    {isWeek && (
                      <Typography
                        variant="caption"
                        component="span"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.3 }}
                      >
                        {entry.bills}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* The tooltip. Anchored at the bar's column, kept inside the
               chart's edges by shifting with its own position; the bars'
               labels already say all this to a screen reader. */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                top: 0,
                left: `${tooltipPercent}%`,
                transform: `translateX(-${tooltipPercent}%)`,
                zIndex: 1,
                minWidth: 128,
                px: 1,
                py: 0.5,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 1.5,
                boxShadow: 2,
                pointerEvents: "none",
                opacity: active ? 1 : 0,
                transition: `opacity ${TOOLTIP_MS}ms ease-out`,
              }}
            >
              {active && (
                <>
                  <Typography
                    variant="caption"
                    component="p"
                    color="text.secondary"
                  >
                    {formatReportDay(active.day)}
                    {active.day === today ? " · Today" : ""}
                  </Typography>
                  <Typography
                    variant="body2"
                    component="p"
                    sx={moneyToneSx("income")}
                  >
                    {formatAmount(active.sales)}
                  </Typography>
                  <Typography
                    variant="caption"
                    component="p"
                    color="text.secondary"
                  >
                    {countLabel(active.bills, "bill", "bills")}
                  </Typography>
                  {isTouch && (
                    <Typography
                      variant="caption"
                      component="p"
                      color="text.secondary"
                    >
                      Tap again to open
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Button
        variant="text"
        onClick={() => setIsTableOpen((open) => !open)}
        aria-expanded={isTableOpen}
        aria-controls={tableId}
        endIcon={
          <ExpandMoreIcon
            sx={{
              transform: isTableOpen ? "rotate(180deg)" : "none",
              transition: "transform 160ms ease-out",
            }}
          />
        }
        sx={{ mt: 1, minHeight: 44 }}
      >
        View as table
      </Button>

      <Fade
        in={isTableOpen}
        timeout={TABLE_FADE_MS}
        easing="ease-out"
        unmountOnExit
      >
        <Box id={tableId}>
          <DailySalesTable
            daily={daily}
            caption={`Daily sales, ${periodLabel(period)}`}
          />
        </Box>
      </Fade>

      {/* The chart's text equivalent while the table above is closed.
         Hidden on the WRAPPER: on a <table> itself, clip/overflow/size
         land on the inner table box (the outer wrapper box takes the
         positioning), so the table would still show. */}
      {!isTableOpen && (
        <Box sx={visuallyHiddenSx}>
          <table>
            <caption>Daily sales, {periodLabel(period)}</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Sales</th>
                <th scope="col">Bills</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((entry) => (
                <tr key={entry.day}>
                  <th scope="row">{formatReportDay(entry.day)}</th>
                  <td>{formatAmount(entry.sales)}</td>
                  <td>{entry.bills}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </Card>
  );
}

/** "View as table": every day of the period (already loaded — no paging)
 *  in a box about 10 rows tall with its own scroll, the header row and
 *  the Total row pinned. Zero days are muted. */
function DailySalesTable({
  daily,
  caption,
}: {
  daily: DailySales[];
  caption: string;
}) {
  const totalSales = daily.reduce((sum, entry) => sum + entry.sales, 0);
  const totalBills = daily.reduce((sum, entry) => sum + entry.bills, 0);
  const numberSx = {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  } as const;
  const pinnedSx = {
    position: "sticky",
    zIndex: 1,
    bgcolor: "background.paper",
  } as const;

  return (
    <Box
      // Scrollable, so reachable by keyboard (arrow keys scroll it).
      tabIndex={0}
      role="region"
      aria-label={caption}
      sx={(theme) => ({
        mt: 1,
        maxHeight: TABLE_MAX_HEIGHT,
        overflowY: "auto",
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      })}
    >
      <Table
        size="small"
        sx={{
          "& .MuiTableCell-root": {
            px: { xs: 1.5, sm: 2 },
            whiteSpace: "nowrap",
          },
        }}
      >
        <Box component="caption" sx={visuallyHiddenSx}>
          {caption}
        </Box>
        <TableHead>
          <TableRow
            sx={{
              "& .MuiTableCell-root": {
                ...pinnedSx,
                top: 0,
                color: "text.secondary",
              },
            }}
          >
            <TableCell scope="col">
              <Typography variant="caption">Day</Typography>
            </TableCell>
            <TableCell scope="col" sx={numberSx}>
              <Typography variant="caption">Sales</Typography>
            </TableCell>
            <TableCell scope="col" sx={numberSx}>
              <Typography variant="caption">Bills</Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {daily.map((entry) => {
            const isZero = entry.sales === 0;
            const rowColor = isZero ? "text.secondary" : "text.primary";
            return (
              <TableRow key={entry.day}>
                <TableCell component="th" scope="row" sx={{ color: rowColor }}>
                  {formatReportDay(entry.day)}
                </TableCell>
                <TableCell
                  sx={{
                    ...numberSx,
                    color: isZero ? "text.secondary" : moneyColor("income"),
                  }}
                >
                  {formatAmount(entry.sales)}
                </TableCell>
                <TableCell sx={{ ...numberSx, color: rowColor }}>
                  {entry.bills}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow
            sx={{
              "& .MuiTableCell-root": {
                ...pinnedSx,
                bottom: 0,
                borderTop: 1,
                borderBottom: 0,
                borderColor: "divider",
              },
            }}
          >
            <TableCell
              component="th"
              scope="row"
              sx={{ color: "text.primary" }}
            >
              <Typography variant="body2" sx={moneyToneSx("neutral")}>
                Total
              </Typography>
            </TableCell>
            <TableCell sx={numberSx}>
              <Typography variant="body2" sx={moneyToneSx("income")}>
                {formatAmount(totalSales)}
              </Typography>
            </TableCell>
            <TableCell sx={numberSx}>
              <Typography variant="body2" sx={moneyToneSx("neutral")}>
                {totalBills}
              </Typography>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Box>
  );
}
