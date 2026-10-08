"use server";

import { revalidatePath } from "next/cache";
import { TableDraftService, TableSessionService } from "@/app/services";
import { AppError } from "@/app/lib/errors";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { getContributorToken } from "@/app/lib/storefront/contributorToken";
import { toDraftLine, toLabelledCartLine } from "@/app/lib/order/roundLine";
import { orderLinesTotal } from "@/app/lib/order/orderTotals";
import { approvalTiming } from "@/app/lib/approval/approvalTiming";
import {
  addDraftItemSchema,
  removeDraftItemSchema,
  updateDraftItemSchema,
  submitDraftSchema,
  pollTableSchema,
  AddDraftItemInput,
  RemoveDraftItemInput,
  UpdateDraftItemInput,
  SubmitDraftInput,
} from "@/app/lib/schemas/customerOrderSchema";
import { config } from "@/app/utils/config";

const url = config.orderAppUrl;

/** Every draft action below resolves "who is this" from
 *  CONTRIBUTOR_TOKEN_COOKIE + a client-supplied tableId, never trusting a
 *  client-supplied identity directly. Throws (not null): these callers
 *  have no reasonable fallback besides surfacing an error.
 *
 *  Two distinct reasons a browser might fail this, both surfaced with
 *  the same message and treated identically by every caller: no token
 *  at all (this browser was never let into this table — see
 *  getContributorToken's own comment), or a token that WAS valid once
 *  but was minted under a table epoch that's since moved past it (the
 *  table got paid and reopened for a new group — see
 *  Table.contributorEpoch's own comment). A token can't be minted
 *  here either way — only the QR scan Route Handler can. */
async function requireContributorToken(tableId: number) {
  const token = await getContributorToken(tableId);
  if (
    !token ||
    !(await TableDraftService.isTokenCurrentForTable(tableId, token))
  ) {
    throw new AppError(
      "This table's order was closed. Scan the QR code again to start a new one.",
      "UNAUTHORIZED",
    );
  }
  return token;
}

/** A draft line as it goes back to the client after an add or edit:
 *  labelled ("You" + its number across the tab), never the token. */
async function labelOwnLine<Line extends { id: number }>(
  tableId: number,
  contributorToken: string,
  line: Line,
) {
  const labels = await TableDraftService.getContributorLabels(
    tableId,
    contributorToken,
  );
  return {
    ...line,
    ...(labels.get(line.id) ?? { isMine: true, contributorNo: null }),
  };
}

const safeAddDraftItem = toSafeResult(async (input: AddDraftItemInput) => {
  const contributorToken = await requireContributorToken(input.tableId);
  const line = await TableDraftService.addDraftItem(
    input.tableId,
    contributorToken,
    input.menuId,
    input.quantity,
    input.addonIds,
    input.note,
  );
  return labelOwnLine(input.tableId, contributorToken, line);
});

/** Table QR's add-to-draft — see MenuBrowser's
 *  onAddToCart contract (same shape both flows' dialogs already
 *  expect: menuId + addonIds in, an error string or null out). */
export async function addDraftItemAction(
  tableId: number,
  menuId: number,
  quantity: number,
  addonIds: number[] = [],
  note?: string,
) {
  const result = await validateWith(addDraftItemSchema, {
    tableId,
    menuId,
    quantity,
    addonIds,
    note,
  }).asyncAndThen(safeAddDraftItem);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
    revalidatePath(`${url}/cart`);
  }
  return actionResult;
}

const safeRemoveDraftItem = toSafeResult(
  async (input: RemoveDraftItemInput) => {
    const contributorToken = await requireContributorToken(input.tableId);
    return TableDraftService.removeDraftItem(contributorToken, input.orderId);
  },
);

export async function removeDraftItemAction(tableId: number, orderId: number) {
  const result = await validateWith(removeDraftItemSchema, {
    tableId,
    orderId,
  }).asyncAndThen(safeRemoveDraftItem);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
    revalidatePath(`${url}/cart`);
  }
  return actionResult;
}

const safeUpdateDraftItem = toSafeResult(
  async (input: UpdateDraftItemInput) => {
    const contributorToken = await requireContributorToken(input.tableId);
    const line = await TableDraftService.updateDraftItem(
      contributorToken,
      input.orderId,
      input.quantity,
      input.addonIds,
      input.note,
    );
    return labelOwnLine(input.tableId, contributorToken, line);
  },
);

/** Powers DraftList's Edit button — MenuDetailDialog reused in "edit"
 *  mode (see its own editing prop) calls this instead of
 *  addDraftItemAction when it opened pre-filled from an existing
 *  line, same ownership check as removeDraftItemAction. */
export async function updateDraftItemAction(
  tableId: number,
  orderId: number,
  quantity: number,
  addonIds: number[] = [],
  note?: string,
) {
  const result = await validateWith(updateDraftItemSchema, {
    tableId,
    orderId,
    quantity,
    addonIds,
    note,
  }).asyncAndThen(safeUpdateDraftItem);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
    revalidatePath(`${url}/cart`);
  }
  return actionResult;
}

const safeSubmitDraft = toSafeResult(async (input: SubmitDraftInput) => {
  // Membership check only — submitDraft itself merges every
  // contributor's picks regardless of who presses the button, so
  // this doesn't need the token for anything beyond proving "was
  // this browser actually let into this table".
  await requireContributorToken(input.tableId);
  return TableDraftService.submitDraft(input.tableId, input.locationId, false);
});

/** "Send to Kitchen" — see TableDraftService.submitDraft for the
 *  merge itself. No cookie to set afterward (unlike Counter's
 *  submitCartAction, which sometimes moves the cookie onto a new
 *  round): the new round's status is tableId-keyed, not
 *  session-token-keyed, so every phone at the table picks it up on
 *  its next pollTableAction tick without anything needing to be
 *  written to this particular browser's cookie. */
export async function submitDraftAction(tableId: number, locationId: number) {
  const result = await validateWith(submitDraftSchema, {
    tableId,
    locationId,
  }).asyncAndThen(safeSubmitDraft);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
    revalidatePath(`${url}/cart`);
  }
  return actionResult;
}

/**
 * Table QR's polling action — tableId-keyed rather than cookie-keyed
 * (see TableDraftService's class comment for why: every phone at a
 * table must see the SAME draft list and round status regardless of
 * which phone did what, and a session-token cookie couldn't provide
 * that once a customer starts a second round — see the "Round 2 sync
 * bug" design discussion). Requires a contributorToken for the same
 * membership reasoning as the other draft actions — this returns
 * order details (menu, addons), which a stranger who never scanned
 * this table's QR has no business seeing.
 *
 * Returns BOTH the current draft list and the active round's status
 * (if any) in one call, so the client only needs one poll loop rather
 * than two running against the same table. Invalid input (e.g. a
 * malformed tableId) is treated the same as "not authorized" — a
 * polling loop shouldn't surface a validation error to the UI, it
 * should just stop reporting anything useful.
 */
export async function pollTableAction(tableId: number, locationId: number) {
  const parsed = pollTableSchema.safeParse({ tableId, locationId });
  if (!parsed.success) {
    return { authorized: false as const };
  }

  const contributorToken = await getContributorToken(parsed.data.tableId);
  if (
    !contributorToken ||
    !(await TableDraftService.isTokenCurrentForTable(
      parsed.data.tableId,
      contributorToken,
    ))
  ) {
    return { authorized: false as const };
  }

  const [draftItems, activeRound, shortages, rejectedRound, labels] =
    await Promise.all([
      TableDraftService.getDraftItemsForTable(parsed.data.tableId),
      TableSessionService.getActiveRoundWithOrdersForTable(parsed.data.tableId),
      TableDraftService.getShortagesForTable(
        parsed.data.tableId,
        parsed.data.locationId,
      ),
      // The table's last round, if the counter turned it down / let it
      // expire — shown once on the cart page (see OrderRejectedScreen).
      TableSessionService.getRejectedRoundForTable(parsed.data.tableId),
      // Who's who as labels — the tokens stay on the server.
      TableDraftService.getContributorLabels(
        parsed.data.tableId,
        contributorToken,
      ),
    ]);

  return {
    authorized: true as const,
    draftItems: draftItems.map((item) => toDraftLine(item, labels)),
    activeRound: activeRound
      ? {
          id: activeRound.id,
          orderNumber: activeRound.orderNumber,
          status: activeRound.status,
          total: orderLinesTotal(activeRound.orders),
          // The soft countdown (server clock) — same shape as Counter's,
          // but a Table round never auto-cancels (see approvalDeadline).
          approval: approvalTiming(activeRound, new Date()),
        }
      : null,
    roundItems: activeRound
      ? activeRound.orders.map((order) => toLabelledCartLine(order, labels))
      : [],
    shortages,
    rejectedRound,
  };
}
