"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Box, Fab, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
  getHistoryDetailAction,
  getHistorySummaryAction,
  type CancelledRoundListItem,
  type CancelledRoundDetail,
  type PaidBillDetail,
  type PaidBillListItem,
} from "./action";
import HistoryHeader from "./HistoryHeader";
import SummaryCards from "./SummaryCards";
import HistoryList from "./HistoryList";
import HistoryDetail from "./HistoryDetail";
import HistoryDetailPanel from "./HistoryDetailPanel";
import HistoryDetailOverlay from "./HistoryDetailOverlay";
import { useDebouncedValue } from "@/app/lib/hooks/useDebouncedValue";

type Summary = {
  paid: { bills: number; revenue: number; avgBill: number };
  cancelled: { count: number; notCharged: number };
};

type DetailResult =
  | { id: number; data: PaidBillDetail | CancelledRoundDetail; error?: undefined }
  | { id: number; data?: undefined; error: string };

interface HistoryViewProps {
  day: string;
  tab: "paid" | "cancelled";
  initialBillId: number | null;
  minDay: string;
  maxDay: string;
  today: string;
  shopTimezone: string;
  locationName: string | null;
  initialSummary: Summary;
  initialItems: (PaidBillListItem | CancelledRoundListItem)[];
  initialNextCursor: string | null;
}

const EMPTY_MESSAGE: Record<"paid" | "cancelled", string> = {
  paid: "No paid bills on this day",
  cancelled: "No cancelled orders on this day",
};

/**
 * Top-level client orchestrator — one instance per (day, tab): page.tsx
 * gives it `key={`${day}-${tab}`}`, so changing either fully remounts
 * this component and everything below it starts clean (Rule 17: "changing
 * day or tab resets the list, cursor and selection"). Only `search` and
 * `bill` (read live from the URL) can change WITHOUT a remount, which is
 * why HistoryList is separately keyed on search below.
 */
export default function HistoryView({
  day,
  tab,
  initialBillId,
  minDay,
  maxDay,
  today,
  shopTimezone,
  locationName,
  initialSummary,
  initialItems,
  initialNextCursor,
}: HistoryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [detailResult, setDetailResult] = useState<DetailResult | null>(null);
  // Whether the currently-open (below lg) overlay was opened by a push
  // in THIS session — if so, Close/Back-button should pop that entry;
  // if the page loaded with ?bill= already in the URL (a shared link),
  // there's nothing to pop, so Close falls back to replacing the URL.
  const openedViaPushRef = useRef(false);

  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > window.innerHeight * 2);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const billParam = searchParams.get("bill");
  const selectedId = billParam !== null && /^\d+$/.test(billParam)
    ? Number(billParam)
    : initialBillId;

  // lg+ only, and only while the URL has no explicit selection: shows
  // the first loaded row's detail without writing it to the URL —
  // this is a DISPLAY default, not a real navigation, so it never
  // forces the extra Server Component round-trip a router.replace
  // would (see HistoryList's onLoaded prop and handleFirstItemLoaded
  // below). An explicit pick (click, or an incoming ?bill= link)
  // always wins over this.
  const [autoSelectedId, setAutoSelectedId] = useState<number | null>(null);
  const effectiveSelectedId = selectedId ?? autoSelectedId;

  useEffect(() => {
    if (effectiveSelectedId === null) return;
    let cancelled = false;
    getHistoryDetailAction({ tab, id: effectiveSelectedId }).then((response) => {
      if (cancelled) return;
      setDetailResult(
        response.success
          ? { id: effectiveSelectedId, data: response.data }
          : { id: effectiveSelectedId, error: response.error.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedId, tab]);

  const detail =
    detailResult && detailResult.id === effectiveSelectedId
      ? detailResult.data ?? null
      : null;
  const detailErrorMessage =
    detailResult && detailResult.id === effectiveSelectedId
      ? detailResult.error ?? null
      : null;
  const isDetailLoading =
    effectiveSelectedId !== null && detailResult?.id !== effectiveSelectedId;

  function navigateTo(params: URLSearchParams) {
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function buildDayHref(newDay: string) {
    const params = new URLSearchParams();
    params.set("day", newDay);
    params.set("tab", tab);
    return `${pathname}?${params.toString()}`;
  }

  function buildTabHref(newTab: "paid" | "cancelled") {
    const params = new URLSearchParams();
    params.set("day", day);
    params.set("tab", newTab);
    return `${pathname}?${params.toString()}`;
  }

  function buildRowHref(id: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("bill", String(id));
    return `${pathname}?${params.toString()}`;
  }

  function selectItem(id: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("bill", String(id));
    if (isDesktop) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else {
      openedViaPushRef.current = true;
      navigateTo(params);
    }
  }

  function closeDetail() {
    if (openedViaPushRef.current) {
      openedViaPushRef.current = false;
      router.back();
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("bill");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleFirstItemLoaded(item: { id: number } | null) {
    if (!isDesktop || selectedId !== null || !item) return;
    setAutoSelectedId(item.id);
  }

  function retryDetail() {
    if (effectiveSelectedId === null) return;
    setDetailResult(null);
    getHistoryDetailAction({ tab, id: effectiveSelectedId }).then((response) => {
      setDetailResult(
        response.success
          ? { id: effectiveSelectedId, data: response.data }
          : { id: effectiveSelectedId, error: response.error.message },
      );
    });
  }

  function handleRefresh() {
    setIsRefreshing(true);
    getHistorySummaryAction({ day }).then((result) => {
      setIsRefreshing(false);
      if (result.success) setSummary(result.data);
    });
    setRefreshKey((key) => key + 1);
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  const isFirstListMount = debouncedSearch === "" && refreshKey === 0;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Two columns from the very top (header included) at lg+ —
           below lg this is just a normal block (the right column is
           display:none inside HistoryDetailPanel itself). */}
        <Box sx={{ display: { lg: "flex" } }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <HistoryHeader
              locationName={locationName}
              day={day}
              minDay={minDay}
              maxDay={maxDay}
              today={today}
              shopTimezone={shopTimezone}
              tab={tab}
              paidCount={summary.paid.bills}
              cancelledCount={summary.cancelled.count}
              search={search}
              onSearchChange={setSearch}
              onNavigateDay={(newDay) => router.push(buildDayHref(newDay))}
              buildDayHref={buildDayHref}
              buildTabHref={buildTabHref}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />

            <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, pt: 2 }}>
              <SummaryCards
                tab={tab}
                paid={summary.paid}
                cancelled={summary.cancelled}
              />

              <HistoryList
                key={`${debouncedSearch}-${refreshKey}`}
                tab={tab}
                day={day}
                search={debouncedSearch}
                seedItems={isFirstListMount ? initialItems : undefined}
                seedNextCursor={isFirstListMount ? initialNextCursor : undefined}
                selectedId={effectiveSelectedId}
                onSelectItem={selectItem}
                buildRowHref={buildRowHref}
                emptyMessage={EMPTY_MESSAGE[tab]}
                onLoaded={handleFirstItemLoaded}
              />
            </Box>
          </Box>

          <HistoryDetailPanel>
            <HistoryDetail
              tab={tab}
              detail={detail}
              isLoading={isDetailLoading}
              errorMessage={detailErrorMessage}
              shopTimezone={shopTimezone}
              onRetry={retryDetail}
            />
          </HistoryDetailPanel>
        </Box>

        <HistoryDetailOverlay
          open={!isDesktop && selectedId !== null}
          onClose={closeDetail}
        >
          <HistoryDetail
            tab={tab}
            detail={detail}
            isLoading={isDetailLoading}
            errorMessage={detailErrorMessage}
            shopTimezone={shopTimezone}
            onRetry={retryDetail}
            onClose={closeDetail}
          />
        </HistoryDetailOverlay>

        {showBackToTop && (
          <Fab
            aria-label="Back to top"
            size="medium"
            color="primary"
            onClick={() => {
              const prefersReducedMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)",
              ).matches;
              window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion ? "auto" : "smooth",
              });
            }}
            sx={{
              position: "fixed",
              right: 16,
              bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
              width: 48,
              height: 48,
            }}
          >
            <KeyboardArrowUpIcon />
          </Fab>
        )}
      </Box>
    </LocalizationProvider>
  );
}
