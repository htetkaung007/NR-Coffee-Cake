"use server";

import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import { getSessionContext } from "@/app/lib/session";
import { todayInShop } from "@/app/lib/shopDay";
import {
  historyDetailInputSchema,
  historyListInputSchema,
  historySummaryInputSchema,
  type HistoryDetailInput,
  type HistoryListInput,
  type HistorySummaryInput,
} from "@/app/lib/schemas/orderHistorySchema";
import { LocationService, OrderHistoryService } from "@/app/services";

/** Every action below needs the same thing: the signed-in user's
 *  currently-selected location. One local helper (not a global lib
 *  addition — Rule 3 colocation) instead of repeating this in all
 *  four action bodies. */
async function resolveLocationId(): Promise<number> {
  const { companyId, userId } = await getSessionContext();
  if (!companyId || !userId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }

  const selectedLocation = await LocationService.getSelectedLocation(userId);
  if (!selectedLocation) {
    throw new AppError(
      "Select a location before viewing order history.",
      "NO_SELECTED_LOCATION",
    );
  }
  return selectedLocation.locationId;
}

/** A list row as it crosses the Server Action boundary — every Date
 *  from the Service becomes an ISO string here (same convention as
 *  order/page.tsx and order/[entryKey]/page.tsx: "dates cross the
 *  Server→Client boundary as ISO strings"). */
export type PaidBillListItem = Omit<
  Awaited<ReturnType<typeof OrderHistoryService.listPaidBills>>["items"][number],
  "paidAt" | "openedAt"
> & { paidAt: string; openedAt: string };

export type CancelledRoundListItem = Omit<
  Awaited<
    ReturnType<typeof OrderHistoryService.listCancelledRounds>
  >["items"][number],
  "cancelledAt" | "createdAt"
> & { cancelledAt: string; createdAt: string };

const safeGetHistoryList = toSafeResult(async (input: HistoryListInput) => {
  const locationId = await resolveLocationId();
  const args = {
    locationId,
    day: input.day,
    search: input.search,
    cursor: input.cursor,
  };

  if (input.tab === "paid") {
    const page = await OrderHistoryService.listPaidBills(args);
    return {
      nextCursor: page.nextCursor,
      items: page.items.map(
        (item): PaidBillListItem => ({
          ...item,
          paidAt: item.paidAt.toISOString(),
          openedAt: item.openedAt.toISOString(),
        }),
      ),
    };
  }

  const page = await OrderHistoryService.listCancelledRounds(args);
  return {
    nextCursor: page.nextCursor,
    items: page.items.map(
      (item): CancelledRoundListItem => ({
        ...item,
        cancelledAt: item.cancelledAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      }),
    ),
  };
});

/** One shop-day page of either tab — the History page's main list. */
export async function getHistoryListAction(input: {
  tab: "paid" | "cancelled";
  day: string;
  search?: string;
  cursor?: string;
}) {
  const result = await validateWith(
    historyListInputSchema,
    input,
  ).asyncAndThen(safeGetHistoryList);
  return toActionResult(result);
}

const safeGetHistorySummary = toSafeResult(
  async (input: HistorySummaryInput) => {
    const locationId = await resolveLocationId();
    const [paid, cancelled] = await Promise.all([
      OrderHistoryService.getPaidSummary({ locationId, day: input.day }),
      OrderHistoryService.getCancelledSummary({ locationId, day: input.day }),
    ]);
    return { paid, cancelled };
  },
);

/** Both tabs' header numbers in one call, so the tab labels ("Paid (12)"
 *  / "Cancelled (3)") don't need a separate round trip per tab. */
export async function getHistorySummaryAction(input: { day: string }) {
  const result = await validateWith(
    historySummaryInputSchema,
    input,
  ).asyncAndThen(safeGetHistorySummary);
  return toActionResult(result);
}

/** Detail shapes as they cross the boundary — same ISO-string
 *  convention as the list rows above. */
export type PaidBillDetail = Omit<
  Awaited<ReturnType<typeof OrderHistoryService.getPaidBillDetail>>,
  "paidAt" | "startedAt" | "rounds"
> & {
  paidAt: string;
  startedAt: string;
  rounds: (Omit<
    Awaited<
      ReturnType<typeof OrderHistoryService.getPaidBillDetail>
    >["rounds"][number],
    "time"
  > & { time: string })[];
};

export type CancelledRoundDetail = Omit<
  Awaited<ReturnType<typeof OrderHistoryService.getCancelledRoundDetail>>,
  "cancelledAt" | "createdAt"
> & { cancelledAt: string; createdAt: string };

const safeGetHistoryDetail = toSafeResult(
  async (input: HistoryDetailInput) => {
    const locationId = await resolveLocationId();

    if (input.tab === "paid") {
      const bill = await OrderHistoryService.getPaidBillDetail({
        locationId,
        billId: input.id,
      });
      const detail: PaidBillDetail = {
        ...bill,
        paidAt: bill.paidAt.toISOString(),
        startedAt: bill.startedAt.toISOString(),
        rounds: bill.rounds.map((round) => ({
          ...round,
          time: round.time.toISOString(),
        })),
      };
      return detail;
    }

    const session = await OrderHistoryService.getCancelledRoundDetail({
      locationId,
      sessionId: input.id,
    });
    const detail: CancelledRoundDetail = {
      ...session,
      cancelledAt: session.cancelledAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
    return detail;
  },
);

/** A row's full breakdown — the detail drawer/dialog opened from
 *  either tab's list. */
export async function getHistoryDetailAction(input: {
  tab: "paid" | "cancelled";
  id: number;
}) {
  const result = await validateWith(
    historyDetailInputSchema,
    input,
  ).asyncAndThen(safeGetHistoryDetail);
  return toActionResult(result);
}

const safeGetHistoryBounds = toSafeResult(async () => {
  const locationId = await resolveLocationId();
  const minDay =
    (await OrderHistoryService.getFirstOrderDay(locationId)) ?? todayInShop();
  return { minDay, maxDay: todayInShop() };
});

/** The date picker's allowed range — no schema/input to validate,
 *  nothing to search by, so this skips validateWith entirely (same as
 *  getPendingApprovalsAction elsewhere, which also takes no input). */
export async function getHistoryBoundsAction() {
  const result = await safeGetHistoryBounds();
  return toActionResult(result);
}
