import { Box, Typography } from "@mui/material";
import { LocationService, OrderHistoryService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import { todayInShop } from "@/app/lib/shopDay";
import { config } from "@/app/utils/config";
import HistoryView from "./HistoryView";

const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

/** Clamps whatever the URL gave to something safe to query with,
 *  without a hard error — a hand-edited/stale link just falls back to
 *  today, same spirit as OrderDetailPage falling back to the list on a
 *  dead entryKey rather than a crash page. */
function resolveDay(raw: string | undefined, today: string, minDay: string) {
  if (!raw || !DAY_FORMAT.test(raw)) return today;
  if (raw > today) return today;
  if (raw < minDay) return minDay;
  return raw;
}

function resolveTab(raw: string | undefined): "paid" | "cancelled" {
  return raw === "cancelled" ? "cancelled" : "paid";
}

/** The selected tab's first page, with dates already turned into ISO
 *  strings (same "Server→Client boundary" convention order/page.tsx
 *  and order/[entryKey]/page.tsx use) — a plain if/else (not a shared
 *  promise reused across branches) so each branch's `page.items` stays
 *  concretely typed instead of the PaidBillListItem|CancelledRoundListItem
 *  union TypeScript can't narrow from a runtime `tab` check alone. */
async function loadFirstPage(
  tab: "paid" | "cancelled",
  locationId: number,
  day: string,
) {
  if (tab === "paid") {
    const page = await OrderHistoryService.listPaidBills({ locationId, day });
    return {
      nextCursor: page.nextCursor,
      items: page.items.map((item) => ({
        ...item,
        paidAt: item.paidAt.toISOString(),
        openedAt: item.openedAt.toISOString(),
      })),
    };
  }

  const page = await OrderHistoryService.listCancelledRounds({
    locationId,
    day,
  });
  return {
    nextCursor: page.nextCursor,
    items: page.items.map((item) => ({
      ...item,
      cancelledAt: item.cancelledAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; tab?: string; bill?: string }>;
}) {
  const { day: dayParam, tab: tabParam, bill: billParam } = await searchParams;

  const { userId } = await getSessionContext();
  if (!userId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view order history.
        </Typography>
      </Box>
    );
  }

  const selectedLocation = await LocationService.getSelectedLocation(userId);
  if (!selectedLocation) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          No location selected. Please choose a location first.
        </Typography>
      </Box>
    );
  }
  const { locationId } = selectedLocation;

  const today = todayInShop();
  const [location, firstOrderDay] = await Promise.all([
    LocationService.getLocationById(locationId),
    OrderHistoryService.getFirstOrderDay(locationId),
  ]);
  const minDay = firstOrderDay ?? today;
  const day = resolveDay(dayParam, today, minDay);
  const tab = resolveTab(tabParam);
  const initialBillId =
    billParam && /^\d+$/.test(billParam) ? Number(billParam) : null;

  const [paidSummary, cancelledSummary, firstPage] = await Promise.all([
    OrderHistoryService.getPaidSummary({ locationId, day }),
    OrderHistoryService.getCancelledSummary({ locationId, day }),
    loadFirstPage(tab, locationId, day),
  ]);

  return (
    <HistoryView
      key={`${day}-${tab}`}
      day={day}
      tab={tab}
      initialBillId={initialBillId}
      minDay={minDay}
      maxDay={today}
      today={today}
      shopTimezone={config.shopTimezone}
      locationName={location?.name ?? null}
      initialSummary={{ paid: paidSummary, cancelled: cancelledSummary }}
      initialItems={firstPage.items}
      initialNextCursor={firstPage.nextCursor}
    />
  );
}
