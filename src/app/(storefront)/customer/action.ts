"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  OrderSessionService,
  MenuService,
  OrderSessionCartService,
  TableDraftService,
} from "@/app/services";
import { AppError } from "@/app/lib/errors";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";
import { getContributorToken } from "@/app/lib/contributorToken";
import {
  addToCartSchema,
  removeFromCartSchema,
  updateCartItemSchema,
  menuDetailSchema,
  addDraftItemSchema,
  removeDraftItemSchema,
  updateDraftItemSchema,
  submitDraftSchema,
  pollTableSchema,
  AddToCartInput,
  RemoveFromCartInput,
  UpdateCartItemInput,
  AddDraftItemInput,
  RemoveDraftItemInput,
  UpdateDraftItemInput,
  SubmitDraftInput,
} from "@/app/lib/schemas/customerOrderSchema";
import { isSessionTerminal } from "@/app/services/orderService/orderSession.service";
import { config } from "@/app/utils/config";

/** The one place this file reads the Counter session cookie — every
 *  Counter-flow action below goes through this instead of repeating
 *  `cookies()` + `.get(...)` itself. Counter-only now: Table QR has
 *  no session cookie anymore (see orderSessionCookie.ts's comment on
 *  the removed TABLE_SESSION_COOKIE) — its own actions further down
 *  use getContributorToken + an explicit tableId instead. Returns the
 *  cookie store too (not just the token) since a couple of callers
 *  also need to clear the cookie in the same request. */
async function getCookieToken() {
  const store = await cookies();
  const token = store.get(COUNTER_SESSION_COOKIE)?.value ?? null;
  return { store, token, cookieName: token ? COUNTER_SESSION_COOKIE : null };
}
const url = config.orderAppUrl;

/** Every cart/order action resolves the session from the cookie
 *  itself, never from a client-supplied id — a customer's request can
 *  only ever act on the session their own browser is holding. Uses
 *  getActiveSessionByToken (not the raw getSessionByToken) so an
 *  abandoned-past-40-minutes or already-terminal session is rejected
 *  here too, not just on the page's initial load. Throws (via
 *  toSafeResult) rather than returning null, since these callers have
 *  no reasonable fallback besides surfacing an error. */
async function requireSessionFromCookie() {
  const { token } = await getCookieToken();
  if (!token) {
    throw new AppError("No active order session.", "UNAUTHORIZED");
  }

  const session = await OrderSessionService.getActiveSessionByToken(token);
  if (!session) {
    throw new AppError("Order session not found or has expired.", "NOT_FOUND");
  }
  if (!session.tableId) {
    throw new AppError("Order session has no table.", "VALIDATION");
  }

  return session;
}

const safeAddToCart = toSafeResult(async (input: AddToCartInput) => {
  const session = await requireSessionFromCookie();
  return OrderSessionCartService.addItemToCart(
    session.id,
    session.tableId as number,
    input.menuId,
    input.quantity,
    input.addonIds,
  );
});

export async function addToCartAction(
  menuId: number,
  quantity: number,
  addonIds: number[] = [],
) {
  const result = await validateWith(addToCartSchema, {
    menuId,
    quantity,
    addonIds,
  }).asyncAndThen(safeAddToCart);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
  }
  return actionResult;
}

const safeRemoveFromCart = toSafeResult(async (input: RemoveFromCartInput) => {
  const session = await requireSessionFromCookie();
  return OrderSessionCartService.removeItemFromCart(session.id, input.orderId);
});

export async function removeFromCartAction(orderId: number) {
  const result = await validateWith(removeFromCartSchema, {
    orderId,
  }).asyncAndThen(safeRemoveFromCart);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
  }
  return actionResult;
}

const safeUpdateCartItem = toSafeResult(async (input: UpdateCartItemInput) => {
  const session = await requireSessionFromCookie();
  return OrderSessionCartService.updateItemInCart(
    session.id,
    input.orderId,
    input.quantity,
    input.addonIds,
  );
});

/** Counter QR's counterpart to updateDraftItemAction — powers CartList's
 *  Edit button the same way updateDraftItemAction powers DraftList's
 *  (MenuDetailDialog reused in "edit" mode calls this instead of
 *  addToCartAction when it opened pre-filled from an existing line). */
export async function updateCartItemAction(
  orderId: number,
  quantity: number,
  addonIds: number[] = [],
) {
  const result = await validateWith(updateCartItemSchema, {
    orderId,
    quantity,
    addonIds,
  }).asyncAndThen(safeUpdateCartItem);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
  }
  return actionResult;
}

/** No session required — view-only browsing (hasSession=false) can
 *  open a menu's detail the same as an active order can, so this
 *  doesn't go through requireSessionFromCookie. locationId is passed
 *  explicitly (not read from a session) for that same reason: there
 *  may be no session to read it from. Returns null (not a thrown
 *  error) for a menu that doesn't exist, belongs to a different
 *  location's stock, or fails validation — the modal treats all three
 *  as "nothing to show" rather than an error state. */
export async function getMenuDetailAction(menuId: number, locationId: number) {
  const parsed = menuDetailSchema.safeParse({ menuId, locationId });
  if (!parsed.success) return null;
  return MenuService.getMenuDetailForCustomer(
    parsed.data.menuId,
    parsed.data.locationId,
  );
}

const safeSubmitOrder = toSafeResult(async () => {
  const session = await requireSessionFromCookie();
  return OrderSessionService.submitOrderForApproval(session.id);
});

export async function submitOrderAction() {
  const result = await safeSubmitOrder();
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
  }
  return actionResult;
}

const safeStartNextRound = toSafeResult(async () => {
  const session = await requireSessionFromCookie();
  return OrderSessionService.startNextRound(session);
});

/**
 * "Order More" — Counter QR only now (see
 * OrderSessionService.startNextRound's own comment for why Table QR
 * doesn't need this anymore). Besides the PENDING/COOKING gate itself,
 * this also has to move the customer's cookie onto the new round's
 * token, the same way customer/route.ts's scan does — this IS the
 * customer's own browser making the request (unlike the cashier's
 * Accept/Reject/Paid actions in Backoffice), so a Server Action here
 * can set that response cookie directly.
 */
export async function startNextRoundAction() {
  const { store, cookieName } = await getCookieToken();
  const result = await safeStartNextRound();
  const actionResult = toActionResult(result);

  if (actionResult.success && cookieName) {
    store.set(cookieName, actionResult.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    revalidatePath(`${url}/menu`);
    revalidatePath(`${url}/cart`);
  }

  return actionResult;
}

/**
 * Design doc "Step 3: Polling". Called every few seconds from a client
 * component — Counter QR only now (Table QR's own round-status
 * polling is pollTableRoundAction, further down, which is tableId-
 * keyed rather than cookie-keyed for the same reason drafts are — see
 * TableDraftService's class comment). Deliberately does the
 * PAID-clears-cookie write here (see
 * OrderSessionApprovalService.markSessionPaid's comment) — this IS the
 * customer's own browser making the request, so a Server Action here
 * can set the response cookie, unlike the cashier's Approve/Reject/Paid
 * actions in the Backoffice, which run in a different browser entirely.
 *
 * Doesn't reuse requireSessionFromCookie — that one throws on a
 * missing/absent session, which is the right behavior for cart
 * actions but wrong here: polling needs to report "no_session" as a
 * normal, expected result, not an error. Only the cookie-read
 * (getCookieToken) is shared between them; the terminal-status check
 * reuses the Service's isSessionTerminal so it can't drift from
 * getActiveSessionByToken's definition.
 */
export async function pollOrderStatusAction() {
  const { store, token, cookieName } = await getCookieToken();
  if (!token || !cookieName) {
    return { status: "no_session" as const, cart: [] };
  }

  const session = await OrderSessionService.getSessionByToken(token);
  if (!session) {
    store.set(cookieName, "", { maxAge: 0 });
    return { status: "no_session" as const, cart: [] };
  }

  const refreshed = await OrderSessionService.getSessionStatus(session.id);

  if (isSessionTerminal(refreshed.status)) {
    store.set(cookieName, "", { maxAge: 0 });
  }

  // session.orders (from getSessionByToken, above) reflects the cart
  // as of the START of this call — good enough at a 4s poll interval,
  // and avoids a second DB round-trip just to re-read what's almost
  // certainly still current.
  return {
    status: refreshed.status,
    cart: session.orders.map((order: (typeof session.orders)[0]) => ({
      id: order.id,
      menuId: order.menuId,
      menuName: order.menu.name,
      quantity: order.quantity,
      price: order.menu.price,
    })),
  };
}

/** Table QR's counterpart to requireSessionFromCookie — every draft
 *  action below resolves "who is this" from CONTRIBUTOR_TOKEN_COOKIE
 *  + a client-supplied tableId, never trusting a client-supplied
 *  identity directly. Throws (not null) for the same reason
 *  requireSessionFromCookie does: no reasonable fallback besides
 *  surfacing an error.
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

const safeAddDraftItem = toSafeResult(async (input: AddDraftItemInput) => {
  const contributorToken = await requireContributorToken(input.tableId);
  return TableDraftService.addDraftItem(
    input.tableId,
    contributorToken,
    input.menuId,
    input.quantity,
    input.addonIds,
  );
});

/** Table QR's counterpart to addToCartAction — see MenuBrowser's
 *  onAddToCart contract (same shape both flows' dialogs already
 *  expect: menuId + addonIds in, an error string or null out). */
export async function addDraftItemAction(
  tableId: number,
  menuId: number,
  quantity: number,
  addonIds: number[] = [],
) {
  const result = await validateWith(addDraftItemSchema, {
    tableId,
    menuId,
    quantity,
    addonIds,
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
    return TableDraftService.updateDraftItem(
      contributorToken,
      input.orderId,
      input.quantity,
      input.addonIds,
    );
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
) {
  const result = await validateWith(updateDraftItemSchema, {
    tableId,
    orderId,
    quantity,
    addonIds,
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
 *  startNextRoundAction): the new round's status is tableId-keyed,
 *  not session-token-keyed, so every phone at the table picks it up
 *  on its next pollTableAction tick without anything needing to be
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

  const [draftItems, activeRound, shortages] = await Promise.all([
    TableDraftService.getDraftItemsForTable(parsed.data.tableId),
    OrderSessionService.getActiveRoundForTable(parsed.data.tableId),
    TableDraftService.getShortagesForTable(
      parsed.data.tableId,
      parsed.data.locationId,
    ),
  ]);

  return {
    authorized: true as const,
    myContributorToken: contributorToken,
    draftItems: draftItems.map((item) => ({
      id: item.id,
      menuId: item.menuId,
      menuName: item.menu.name,
      quantity: item.quantity,
      price: item.menu.price,
      contributorToken: item.contributorToken ?? "",
      addonNames: item.OrdersAddons.map((link) => link.addon.name),
      addonIds: item.OrdersAddons.map((link) => link.addonId),
    })),
    activeRound: activeRound
      ? { orderNumber: activeRound.orderNumber, status: activeRound.status }
      : null,
    shortages,
  };
}
