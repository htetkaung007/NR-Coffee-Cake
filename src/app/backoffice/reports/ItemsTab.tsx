"use client";

import { useState } from "react";
import {
  Box,
  Card,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import SearchField from "@/app/components/SearchField";
import EmptyState from "@/app/components/EmptyState";
import SegmentedTabs from "@/app/components/SegmentedTabs";
import { useDebouncedValue } from "@/app/lib/hooks/useDebouncedValue";
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import { periodFor } from "@/app/lib/report/reportPeriod";
import { useReportWords } from "./useReportWords";
import {
  buildItemList,
  reportHref,
  type ReportParams,
  type ReportSortBy,
} from "@/app/lib/report/reportView";
import type { ReportOverview } from "./action";
import AddonsCard from "./AddonsCard";
import ItemRow, { ItemsListHeader } from "./ItemRow";
import { MenuPairingPanel } from "./PairingPanels";
import PairingSection from "./PairingSection";
import { ErrorRetry, ItemRowsSkeleton } from "./ReportStates";
import { usePairing } from "./usePairing";
import type { ItemsState } from "./useReportItems";

const SEARCH_DEBOUNCE_MS = 200;

interface ItemsTabProps {
  overview: ReportOverview;
  /** The shop's current day — the pairing month starts on this month. */
  today: string;
  state: ItemsState;
  onRetry: () => void;
  params: ReportParams;
  onNavigate: (href: string) => void;
}

/** Menus ranked — top or slow sellers, by sales or by quantity — with the
 *  categories as chips that ONLY FILTER the list (a menu's share is always
 *  its share of all sales; there are no category totals), a search, the
 *  add-ons card and, when the numbers add up, the reconciliation strip.
 *  The controls stay on screen whatever the list is doing. */
export default function ItemsTab({
  overview,
  today,
  state,
  onRetry,
  params,
  onNavigate,
}: ItemsTabProps) {
  const t = useTranslations("bo.reports");
  const locale = useLocale();
  const words = useReportWords();
  const money = useStaffMoney();
  const [sortBy, setSortBy] = useState<ReportSortBy>("sales");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  // Add-on pairing is per calendar month and has its own month — the
  // current one to start with — whatever Week | Month the page is on. It
  // loads when this tab opens and again for each month moved to; months
  // already seen are kept (usePairing).
  const [pairingDay, setPairingDay] = useState(today);
  const pairingPeriod = periodFor("month", pairingDay);
  const pairingMonthLabel = words.period(pairingPeriod);
  const pairing = usePairing(pairingPeriod.startDay);
  // Which rows are open — kept across a month change, so the panels just
  // refresh in place.
  const [openMenus, setOpenMenus] = useState<number[]>([]);
  const [openAddons, setOpenAddons] = useState<number[]>([]);
  const toggle = (ids: number[], id: number) =>
    ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id];

  const { kind } = overview.period;
  const list = params.list;
  const hasBills = overview.current.summary.bills > 0;
  const isFiltered = categoryId !== null || debouncedSearch.trim() !== "";

  const rows =
    state.status === "ok"
      ? buildItemList({
          items: state.data.items,
          slowSellers: state.data.slowSellers,
          list,
          sortBy,
          categoryId,
          search: debouncedSearch,
        })
      : [];
  const maxShare = Math.max(0, ...rows.map((row) => row.share));

  return (
    <Stack spacing={2}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          useFlexGap
          sx={{
            gap: 1.5,
            alignItems: { sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <SegmentedTabs
            ariaLabel={t("sellerList")}
            value={list}
            onNavigate={onNavigate}
            items={[
              {
                value: "top",
                label: t("topSellers"),
                href: reportHref({ ...params, tab: "items", list: "top" }),
              },
              {
                value: "slow",
                label: t("slowSellers"),
                href: reportHref({ ...params, tab: "items", list: "slow" }),
              },
            ]}
          />
          <SegmentedTabs
            ariaLabel={t("sortBy")}
            value={sortBy}
            onSelect={setSortBy}
            items={[
              { value: "sales", label: t("bySales") },
              { value: "quantity", label: t("byQuantity") },
            ]}
          />
        </Stack>

        {/* Scrolls sideways — never wraps into a tall block on a phone. */}
        <Stack
          direction="row"
          role="group"
          aria-label={t("categoryFilter")}
          sx={{ gap: 1, overflowX: "auto", pb: 0.5 }}
        >
          {state.status === "ok" ? (
            <>
              <CategoryChip
                label={t("all")}
                selected={categoryId === null}
                onSelect={() => setCategoryId(null)}
              />
              {state.data.categories.map((category) => (
                <CategoryChip
                  key={category.id}
                  label={localizedText(locale, category.name, category.nameMy)}
                  selected={categoryId === category.id}
                  onSelect={() => setCategoryId(category.id)}
                />
              ))}
            </>
          ) : (
            [0, 1, 2, 3].map((index) => (
              <Skeleton
                key={index}
                variant="rounded"
                width={72}
                height={44}
                sx={{ flexShrink: 0, borderRadius: 999 }}
              />
            ))
          )}
        </Stack>

        <SearchField
          label={t("searchMenu")}
          value={search}
          onChange={setSearch}
          sx={{ width: { xs: "100%", sm: 320 } }}
        />
      </Stack>

      <PairingSection
        period={pairingPeriod}
        today={today}
        state={pairing.state}
        onRetry={pairing.retry}
        onChangeDay={setPairingDay}
      />

      {!hasBills ? (
        <EmptyState
          Icon={ReceiptLongIcon}
          message={t("noBills")}
        />
      ) : state.status === "loading" ? (
        <ItemRowsSkeleton />
      ) : state.status === "error" ? (
        <ErrorRetry message={state.message} onRetry={onRetry} />
      ) : (
        <>
          {rows.length === 0 ? (
            <EmptyState
              Icon={isFiltered ? SearchOffIcon : ReceiptLongIcon}
              message={
                isFiltered
                  ? t("noMenuMatches")
                  : list === "top"
                    ? t("noSalesInPeriod")
                    : t("noMenusToShow")
              }
            />
          ) : (
            <Box>
              <ItemsListHeader />
              <Stack
                component="ol"
                spacing={1}
                sx={{ m: 0, p: 0, listStyle: "none" }}
              >
                {rows.map((row) => (
                  <ItemRow
                    key={row.menuId}
                    row={row}
                    maxShare={maxShare}
                    kind={kind}
                    expanded={openMenus.includes(row.menuId)}
                    onToggle={() =>
                      setOpenMenus((ids) => toggle(ids, row.menuId))
                    }
                    panelId={`pairing-menu-${row.menuId}`}
                    panelLabel={t("mostOftenChosenWithLabel", {
                      name: localizedText(locale, row.name, row.nameMy),
                    })}
                    detail={
                      <MenuPairingPanel
                        state={pairing.state}
                        onRetry={pairing.retry}
                        monthLabel={pairingMonthLabel}
                        menuId={row.menuId}
                      />
                    }
                  />
                ))}
              </Stack>
            </Box>
          )}

          <AddonsCard
            addons={state.data.addons}
            pairing={pairing.state}
            onRetryPairing={pairing.retry}
            pairingMonthLabel={pairingMonthLabel}
            expandedIds={openAddons}
            onToggle={(addonId) =>
              setOpenAddons((ids) => toggle(ids, addonId))
            }
          />

          {/* Only when the two halves really explain the bills — nothing
             (no apology) when they don't. */}
          {state.data.reconciled && (
            <Card variant="outlined" sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {t("reconcile", {
                  items: money.amount(state.data.itemsTotal),
                  addons: money.amount(state.data.addonsTotal),
                  sales: money.amount(state.data.salesTotal),
                })}
              </Typography>
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}

function CategoryChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Chip
      label={label}
      clickable
      aria-pressed={selected}
      color={selected ? "primary" : "default"}
      variant={selected ? "filled" : "outlined"}
      onClick={onSelect}
      // 44px tall (DESIGN.md Rule 10), and never squeezed in the row.
      sx={{ height: 44, borderRadius: 999, flexShrink: 0 }}
    />
  );
}
