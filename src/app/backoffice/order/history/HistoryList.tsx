"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import type { SvgIconComponent } from "@mui/icons-material";
import { getHistoryListAction } from "./action";
import type { CancelledRoundListItem, PaidBillListItem } from "./action";
import { CancelledRoundRow, PaidBillRow } from "./HistoryRow";

// Trigger the next page while this many rows are still below the
// viewport — DESIGN.md Rule 23 ("~2-3 rows remain").
const SENTINEL_FROM_END = 3;

type Status = "idle" | "loadingFirst" | "loadingMore" | "errorFirst" | "errorMore";

interface HistoryListProps {
  tab: "paid" | "cancelled";
  day: string;
  search: string;
  seedItems?: (PaidBillListItem | CancelledRoundListItem)[];
  seedNextCursor?: string | null;
  selectedId: number | null;
  onSelectItem: (id: number) => void;
  buildRowHref: (id: number) => string;
  emptyMessage: string;
  /** Fired once, the first time this instance's first page settles —
   *  HistoryView uses it to auto-select the first row on lg+ when the
   *  URL has no `bill` yet. Not fired again on load-more. */
  onLoaded?: (
    firstItem: PaidBillListItem | CancelledRoundListItem | null,
  ) => void;
}

function SkeletonRow() {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Skeleton variant="rounded" width={40} height={40} />
      <Box sx={{ flexGrow: 1 }}>
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="70%" />
      </Box>
      <Skeleton variant="text" width={56} />
    </Stack>
  );
}

function EmptyState({
  Icon,
  message,
}: {
  Icon: SvgIconComponent;
  message: string;
}) {
  return (
    <Stack
      spacing={1}
      sx={{
        alignItems: "center",
        textAlign: "center",
        px: 2,
        py: 6,
        border: 1,
        borderStyle: "dashed",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Icon fontSize="large" sx={{ color: "text.secondary" }} />
      <Typography variant="body1">{message}</Typography>
    </Stack>
  );
}

/**
 * The list section for one (tab, day, search) combination — the parent
 * gives this a fresh `key` whenever any of those change (or Refresh is
 * pressed), so all pagination/selection state below starts clean; see
 * HistoryView's own comment on why a remount is simpler and more
 * reliably correct here than syncing state via effects.
 *
 * `seedItems`/`seedNextCursor` are only ever passed for the page's very
 * first paint (server-rendered data for day/tab, search empty) — every
 * other mount (search changed, tab/day changed, Refresh) fetches its
 * own first page instead of trusting stale data.
 */
export default function HistoryList({
  tab,
  day,
  search,
  seedItems,
  seedNextCursor,
  selectedId,
  onSelectItem,
  buildRowHref,
  emptyMessage,
  onLoaded,
}: HistoryListProps) {
  const [items, setItems] = useState(seedItems ?? []);
  const [nextCursor, setNextCursor] = useState(seedNextCursor ?? null);
  const [status, setStatus] = useState<Status>(seedItems ? "idle" : "loadingFirst");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inFlightRef = useRef(false);

  // Reports the first page's first row exactly once per mount, whether
  // it arrived via seed data (synchronously) or a fetch (later) — see
  // HistoryListProps.onLoaded's own comment.
  const hasReportedRef = useRef(false);
  useEffect(() => {
    if (hasReportedRef.current) return;
    if (status !== "idle") return;
    hasReportedRef.current = true;
    onLoaded?.(items[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const loadFirstPage = useCallback(async () => {
    setStatus("loadingFirst");
    setErrorMessage(null);
    const result = await getHistoryListAction({
      tab,
      day,
      search: search || undefined,
    });
    if (!result.success) {
      setStatus("errorFirst");
      setErrorMessage(result.error.message);
      return;
    }
    setItems(result.data.items);
    setNextCursor(result.data.nextCursor);
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current || !nextCursor) return;
    inFlightRef.current = true;
    setStatus("loadingMore");
    setErrorMessage(null);
    const result = await getHistoryListAction({
      tab,
      day,
      search: search || undefined,
      cursor: nextCursor,
    });
    inFlightRef.current = false;
    if (!result.success) {
      setStatus("errorMore");
      setErrorMessage(result.error.message);
      return;
    }
    setItems((current) => [...current, ...result.data.items]);
    setNextCursor(result.data.nextCursor);
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor]);

  // This instance is remounted (fresh key) whenever tab/day/search
  // change, so an empty dependency array really does mean "once per
  // (tab, day, search)", not "once ever". Fetches inline via .then()
  // (rather than calling loadFirstPage by reference) so the setState
  // calls are visibly deferred to the promise's resolution, not the
  // effect's own synchronous body — same shape as MenuDetailDialog's
  // fetch-on-open effect.
  useEffect(() => {
    if (seedItems) return;
    let cancelled = false;
    getHistoryListAction({ tab, day, search: search || undefined }).then(
      (result) => {
        if (cancelled) return;
        if (!result.success) {
          setStatus("errorFirst");
          setErrorMessage(result.error.message);
          return;
        }
        setItems(result.data.items);
        setNextCursor(result.data.nextCursor);
        setStatus("idle");
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The IntersectionObserver callback always calls the LATEST loadMore
  // (which closes over the current nextCursor) via a ref, same pattern
  // as usePolling.ts, so the observer itself is only ever created once.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelNodeRef = useRef<Element | null>(null);
  const setSentinelRef = useCallback((node: Element | null) => {
    if (sentinelNodeRef.current && observerRef.current) {
      observerRef.current.unobserve(sentinelNodeRef.current);
    }
    sentinelNodeRef.current = node;
    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreRef.current();
      },
      { rootMargin: "0px 0px 200px 0px" },
    );
    const current = observerRef.current;
    return () => current.disconnect();
  }, []);

  if (status === "loadingFirst") {
    return (
      <Stack spacing={1}>
        {[0, 1, 2].map((index) => (
          <SkeletonRow key={index} />
        ))}
      </Stack>
    );
  }

  if (status === "errorFirst") {
    return (
      <Stack spacing={1} sx={{ alignItems: "center", py: 4 }}>
        <Typography color="text.secondary">
          {errorMessage ?? "Couldn't load order history."}
        </Typography>
        <Button variant="outlined" onClick={() => void loadFirstPage()}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        Icon={tab === "paid" ? ReceiptLongIcon : EventBusyIcon}
        message={emptyMessage}
      />
    );
  }

  return (
    <Box>
      <Stack spacing={1}>
        {items.map((item, index) => {
          const sentinelProps =
            index === items.length - SENTINEL_FROM_END
              ? { ref: setSentinelRef }
              : {};
          return (
            <Box key={item.id} {...sentinelProps}>
              {tab === "paid" ? (
                <PaidBillRow
                  item={item as PaidBillListItem}
                  href={buildRowHref(item.id)}
                  onSelect={() => onSelectItem(item.id)}
                  selected={item.id === selectedId}
                />
              ) : (
                <CancelledRoundRow
                  item={item as CancelledRoundListItem}
                  href={buildRowHref(item.id)}
                  onSelect={() => onSelectItem(item.id)}
                  selected={item.id === selectedId}
                />
              )}
            </Box>
          );
        })}
      </Stack>

      {status === "loadingMore" && (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {[0, 1].map((index) => (
            <SkeletonRow key={index} />
          ))}
        </Stack>
      )}

      {status === "errorMore" && (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", justifyContent: "center", py: 2 }}
        >
          <Typography color="text.secondary">
            {errorMessage ?? "Couldn't load more"}
          </Typography>
          <Button variant="outlined" size="small" onClick={() => void loadMore()}>
            Retry
          </Button>
        </Stack>
      )}

      {nextCursor === null && status === "idle" && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 2 }}
        >
          That&apos;s all
        </Typography>
      )}

      {nextCursor !== null && status !== "loadingMore" && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <Button variant="outlined" onClick={() => void loadMore()}>
            Load more
          </Button>
        </Box>
      )}
    </Box>
  );
}
