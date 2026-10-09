import { NotFoundError, ValidationError } from "@/app/lib/errors";
import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import type { RejectDetails } from "@/app/lib/order/rejectReason";
import { MenuStockService } from "../menuStock.service";
import {
  deriveDecidedAt,
  deriveRequestedAt,
} from "@/app/lib/order/cancellation";
import { APPROVAL_WINDOW_MINUTES } from "@/app/lib/approval/approvalWindow";
import { canActAtLocation } from "@/app/lib/access/ownership";
import type { LocatedScope } from "@/app/lib/access/rolePolicy";

type Tx = Prisma.TransactionClient;

/** cancelSession's reason, and what goes with it: a rejection always
 *  carries the cashier's reason (and, for Other only, a note); an expiry
 *  or an unsent cart never does (a compile error either way). */
type CancelArgs =
  | [reason: "REJECTED", details: RejectDetails]
  | [reason: "EXPIRED"]
  | [reason: "UNSUBMITTED"];

// A session that has reached one of these statuses is "done" — a new
// scan (Table QR) or a new cookie-matched visit (Counter QR) must not
// land inside it anymore. PAID is the expected/common case (design doc
// section 3). COMPLETED and CANCELLED are treated the same way here so
// a cancelled or already-served session can't silently keep a table or
// a customer's cookie locked forever.
const TERMINAL_STATUSES = ["PAID", "COMPLETED", "CANCELLED"];

/** The single definition of "is this session done" — exported so
 *  Controllers (page.tsx / action.ts) ask the Service instead of each
 *  keeping their own copy of TERMINAL_STATUSES, which would drift out
 *  of sync the moment one of them is updated and the others aren't
 *  (Rule 1: Service owns business logic, Controller stays thin). */
export function isSessionTerminal(status: string) {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

// A session still sitting in CART this long after being created — no
// order ever submitted through it — is treated as abandoned (customer
// scanned and never came back to it). Checked lazily wherever a
// session is resolved from its cookie (getActiveSessionByToken), never
// on a timer: there's no polling while a session is still CART (the
// customer's client only polls once PENDING_APPROVAL — see
// CounterOrderClient), so in practice this gets noticed the next time
// the customer's browser makes any request — a page reload, or an
// add-to-cart/submit attempt — not the instant the 40 minutes elapse.
const CART_ABANDON_MINUTES = 5;

/** Exported for CounterSessionService's cookie lookups — the one
 *  definition, shared with getOrStartCartRound below.
 *
 *  A session that has ever left CART (submitted at least once, even
 *  if that submission was later rejected) is no longer at risk of
 *  being treated as "abandoned" — see CART_ABANDON_MINUTES. Only a
 *  session that has NEVER been submitted can still be sitting in CART
 *  by the time this runs, so checking the current status is enough;
 *  no separate "has this ever been submitted" flag is needed. */
export function isAbandonedCart(session: { status: string; createdAt: Date }) {
  if (session.status !== "CART") return false;
  const ageMs = Date.now() - session.createdAt.getTime();
  return ageMs > CART_ABANDON_MINUTES * 60_000;
}

/** A PENDING_APPROVAL round whose approval window has run out — it
 *  counts as timed out even before anything has written EXPIRED (that
 *  happens lazily, see getSessionStatus). The one definition, shared by
 *  that lazy expiry and the read-only checks that must not write. */
export function isPastApprovalWindow(
  session: { status: string; approvalExpiresAt: Date | null },
  now: Date = new Date(),
) {
  return (
    session.status === "PENDING_APPROVAL" &&
    session.approvalExpiresAt !== null &&
    session.approvalExpiresAt < now
  );
}

/** Placeholder scheme — see design doc section 9 ("orderNumber
 *  generation strategy not yet decided"). Swap this one function for a
 *  per-location daily counter later; nothing else needs to change.
 *  Exported so TableDraftService.submitDraft can reuse the exact same
 *  scheme instead of a second copy — every OrderSession gets its
 *  number the same way regardless of which flow created it. */
export function generateOrderNumber(sessionId: number) {
  return `#A${String(sessionId).padStart(3, "0")}`;
}

/**
 * OrderSession domain — the round LIFECYCLE every flow shares: the one
 * cancel writer (cancelSession), the CART -> PENDING_APPROVAL submit,
 * starting the next round, and the lazily-expiring status read. The
 * flows that create and look up rounds live beside it, each split by
 * its own reason to change (CLAUDE.md Rule 14):
 *  - TableSessionService — Table QR scans and a table's rounds;
 *  - CounterSessionService — Counter QR scans, the cookie's session and
 *    its bill;
 *  - StaffOrderService — the staff New Order screen;
 *  - OrderApprovalService / OrderPaymentService / OrderListService —
 *    the Backoffice's accept/reject/expire, mark paid, and Order List.
 * They call down into this one (never the other way round), so there
 * are no import cycles.
 *
 * Table QR and Counter QR are still two distinct scan entry points
 * (resolveTableQrScan / resolveCounterQrScan) — Table QR's scan no
 * longer resolves or creates a session at all (see
 * resolveTableQrScan's own comment — drafts replaced that), while
 * Counter QR still gives each phone its own individual session via
 * cookie the same way it always did. That difference is why a single
 * shared scan function still wouldn't make sense even now.
 */
export class OrderSessionService {
  /** Shared by submitCartRoundForApproval and submitStaffOrder — both need
   *  to atomically decrement stock for every one of the session's CART
   *  items before actually transitioning it out of CART (see the
   *  "decrement at submit, not at add-to-cart/draft" design discussion);
   *  only the target status and whether an approval window gets set
   *  differ between the two, which each keeps as its own small
   *  transaction body around this. A shortage on even one item throws
   *  inside the transaction, rolling back the whole submit — no status
   *  change, no partial decrement left behind. */
  static async decrementStockForSession(
    tx: Tx,
    sessionId: number,
    locationId: number,
  ) {
    const orders = await tx.order.findMany({
      where: { orderSessionId: sessionId, isArchived: false },
      include: { menu: true },
    });
    for (const order of orders) {
      await MenuStockService.decrementStock(
        tx,
        order.menuId,
        order.menu.name,
        locationId,
        order.quantity,
      );
    }
  }

  /** The one place a session is written CANCELLED — every cancel path
   *  (abandoned cart, reject, lazy/batch approval expiry, a leftover
   *  CART round closed at payment) goes through here so the status,
   *  cancelReason and stock give-back can't drift apart.
   *
   *  REJECTED / EXPIRED: the round was submitted, so stock was
   *  decremented at submit (decrementStockForSession /
   *  TableDraftService.submitDraft) — every line's quantity goes back.
   *  The round's own Order rows ARE what submit decremented (Counter
   *  decrements per row; Table submit creates exactly the merged rows
   *  it decremented), so they're the source here too.
   *  UNSUBMITTED: a CART round never touched stock — nothing to restore.
   *
   *  The write is conditional on the status the reason implies
   *  (PENDING_APPROVAL for REJECTED/EXPIRED, CART for UNSUBMITTED), so:
   *  an already-CANCELLED round matches nothing and stock is never given
   *  back twice; and a round that moved on concurrently (e.g. the
   *  cashier Accepted it a moment before a lazy expiry ran) is left
   *  alone rather than cancelled out from under the kitchen. Returns
   *  whether THIS call cancelled it. Must run inside the caller's
   *  transaction (Rule 7: status write + stock give-back + the
   *  cancellation record are one unit).
   *
   *  REJECTED / EXPIRED also write the round's OrderCancellation row —
   *  this is its only writer, and the row is never edited afterwards.
   *  Its times are derived from the session as it was BEFORE the write
   *  below (which clears approvalExpiresAt), so that's read first. Only
   *  a call that actually cancelled the round writes one; UNSUBMITTED
   *  never does. */
  static async cancelSession(tx: Tx, sessionId: number, ...args: CancelArgs) {
    const [reason] = args;
    const wasSubmitted = reason !== "UNSUBMITTED";
    const before = wasSubmitted
      ? await tx.orderSession.findUnique({
          where: { id: sessionId },
          select: {
            approvalExpiresAt: true,
            createdAt: true,
            updateTime: true,
            isCounter: true,
          },
        })
      : null;

    const cancelled = await tx.orderSession.updateMany({
      where: {
        id: sessionId,
        status: wasSubmitted ? "PENDING_APPROVAL" : "CART",
      },
      data: {
        status: "CANCELLED",
        cancelReason: reason,
        approvalExpiresAt: null,
      },
    });
    if (cancelled.count === 0) return false;
    if (!wasSubmitted) return true;

    const session = await tx.orderSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { orders: { where: { isArchived: false } } },
    });
    for (const order of session.orders) {
      await MenuStockService.incrementStock(
        tx,
        order.menuId,
        session.locationId,
        order.quantity,
      );
    }

    if (before) {
      await tx.orderCancellation.create({
        data: {
          orderSessionId: sessionId,
          requestedAt: deriveRequestedAt(before, APPROVAL_WINDOW_MINUTES),
          decidedAt: deriveDecidedAt(
            reason,
            before.approvalExpiresAt,
            new Date(),
          ),
          rejectReason: args[0] === "REJECTED" ? args[1].rejectReason : null,
          note:
            args[0] === "REJECTED" && args[1].rejectReason === "OTHER"
              ? args[1].note
              : null,
        },
      });
    }
    return true;
  }

  /**
   * Counter QR only: a Counter customer whose current round has
   * already been Accepted (PENDING/COOKING) can start a brand-new
   * round for the same table without touching the round already in
   * the kitchen. Table QR doesn't need this anymore — with drafts
   * decoupled from any session (TableDraftService), "Order More"
   * there is just adding more drafts and calling submitDraft again;
   * see that method's own comment.
   *
   * Not called directly by "Order More" itself anymore — the round is
   * created lazily, on the first item actually added (see
   * getOrStartCartRound, this method's only caller now).
   *
   * Only PENDING/COOKING may start a next round: CART has nothing to
   * "confirm" yet (just keep adding to the current one), and
   * PENDING_APPROVAL must be Accepted or Rejected first — starting a
   * second round while the first is still awaiting a decision would
   * let a customer route around a pending Reject.
   *
   * Links the new round to the bill via billSessionId: `session.billSessionId
   * ?? session.id` so round 3 points at round 1 (the bill's root), not
   * round 2 — see OrderSession.billSessionId's own schema comment.
   */
  static async startNextRound(session: {
    id: number;
    locationId: number;
    tableId: number | null;
    isCounter: boolean;
    status: string;
    billSessionId: number | null;
  }) {
    if (session.status !== "PENDING" && session.status !== "COOKING") {
      throw new ValidationError(
        "This order must be confirmed by the counter before you can start a new one.",
      );
    }
    if (!session.tableId) {
      throw new ValidationError("Order session has no table.");
    }
    const tableId = session.tableId;

    return prisma.$transaction(async (tx: Tx) => {
      const next = await tx.orderSession.create({
        data: {
          locationId: session.locationId,
          tableId,
          isCounter: session.isCounter,
          status: "CART",
          orderNumber: "",
          billSessionId: session.billSessionId ?? session.id,
        },
      });

      const numbered = await tx.orderSession.update({
        where: { id: next.id },
        data: { orderNumber: generateOrderNumber(next.id) },
      });

      return numbered;
    });
  }

  /**
   * Counter QR only (throws if !session.isCounter) — "Add to cart"
   * while the current round is already PENDING/COOKING (accepted)
   * needs somewhere to add to. Creates that somewhere LAZILY: only
   * the first item actually added ever creates a round, never a page
   * load or "Order More" tap on their own — otherwise empty CART
   * rounds would pile up every time a customer opened the menu again
   * without adding anything.
   *
   * CART — nothing to resolve, return the session unchanged.
   *
   * PENDING_APPROVAL — refused outright, the same rule startNextRound
   * already enforced: a customer must not be able to route around a
   * pending Reject by starting a fresh round while the current one is
   * still awaiting a decision.
   *
   * PENDING/COOKING — looks for a CART round already on this bill
   * (newest first) before creating one. This find-first is exactly
   * what stops a second "Add to cart" tap from creating a second CART
   * round: the first add's own startNextRound call already created
   * one, so every add after that just reuses it. isAbandonedCart
   * still applies the same as any other CART round, in case that
   * round sat untouched long enough to count as abandoned. Falls
   * through to OrderSessionService.startNextRound (Rule 4: called by
   * class name, not `this`) — the exact creation path "Order More"
   * used to call directly.
   *
   * Honest note on a race: two truly simultaneous first-adds (e.g.
   * two browser tabs) could both miss the find-first and each start a
   * round. That's harmless, not a correctness bug — both rounds still
   * land on the SAME bill (billSessionId ?? id is derived from the
   * session passed in here, not from whichever round wins the race),
   * so the cashier still sees ONE card, and cleanUpAfterPayment
   * already cancels any leftover CART round once the bill is paid
   * either way.
   */
  static async getOrStartCartRound(session: {
    id: number;
    token: string;
    locationId: number;
    tableId: number | null;
    isCounter: boolean;
    status: string;
    billSessionId: number | null;
  }) {
    if (!session.isCounter) {
      throw new ValidationError("This is a Table QR session.");
    }

    if (session.status === "CART") {
      return session;
    }

    if (session.status === "PENDING_APPROVAL") {
      throw new ValidationError(
        "Your order is waiting for the counter to confirm. You can add more once it's accepted.",
      );
    }

    if (session.status !== "PENDING" && session.status !== "COOKING") {
      throw new ValidationError("This order can no longer be edited.");
    }

    const rootId = session.billSessionId ?? session.id;
    const existing = await prisma.orderSession.findFirst({
      where: {
        isCounter: true,
        isArchived: false,
        status: "CART",
        OR: [{ id: rootId }, { billSessionId: rootId }],
      },
      orderBy: { id: "desc" },
    });
    if (existing && !isAbandonedCart(existing)) {
      return existing;
    }

    return OrderSessionService.startNextRound(session);
  }

  /** The CART -> PENDING_APPROVAL step itself, inside the CALLER's
   *  transaction: decrements stock for every line of the round (the
   *  atomic guard — a shortage throws InsufficientStockError and rolls
   *  the whole caller back) and starts the approval window. The caller
   *  has already made sure the round is CART. Used by CartSubmitService
   *  (the customer's browser-held cart, whose lines it inserts in the
   *  same transaction first); refuses nothing itself, so a caller must
   *  never run it on a round that already left CART. */
  static async submitCartRoundForApproval(
    tx: Tx,
    round: { id: number; locationId: number },
  ) {
    const approvalExpiresAt = new Date(
      Date.now() + APPROVAL_WINDOW_MINUTES * 60_000,
    );
    await OrderSessionService.decrementStockForSession(
      tx,
      round.id,
      round.locationId,
    );
    return tx.orderSession.update({
      where: { id: round.id },
      data: { status: "PENDING_APPROVAL", approvalExpiresAt },
    });
  }

  /** Chain lookup for the Backoffice — the round, if staff `scope` may
   *  act where it was ordered (its company; a manager's own location
   *  only — canActAtLocation). Anything else is the same NotFoundError
   *  as a round that doesn't exist. Shared by OrderApprovalService and
   *  StaffOrderService. */
  static async getRoundForStaff(sessionId: number, scope: LocatedScope) {
    const session = await prisma.orderSession.findFirst({
      where: {
        id: sessionId,
        isArchived: false,
        location: { companyId: scope.companyId },
      },
      include: { location: { select: { companyId: true } } },
    });
    if (
      !session ||
      !canActAtLocation(scope, {
        companyId: session.location.companyId,
        locationId: session.locationId,
      })
    ) {
      throw new NotFoundError("OrderSession", sessionId);
    }
    return session;
  }

  /** Read path for the customer's polling endpoint (design doc "Step
   *  3: poll every 3-5 seconds"). Lazily expires a stale
   *  PENDING_APPROVAL session on read rather than needing a
   *  background job — the same pattern as the terminal-session checks
   *  elsewhere in this Service: nothing runs on a timer, expiry is
   *  just "is it past due" checked wherever the status is read. */
  static async getSessionStatus(sessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);

    if (isPastApprovalWindow(session)) {
      // Re-read after cancelling: if the cashier decided in the
      // meantime, cancelSession left the round alone and this returns
      // what actually happened instead.
      return prisma.$transaction(async (tx: Tx) => {
        await OrderSessionService.cancelSession(tx, sessionId, "EXPIRED");
        return tx.orderSession.findUniqueOrThrow({ where: { id: sessionId } });
      });
    }

    return session;
  }
}
