import { prisma } from "../utils/prisma";
import { Prisma } from "../../../prisma/generated/client";
import { InsufficientStockError, ValidationError } from "../lib/errors";
import {
  decideSubmit,
  type SendState,
  type CartLineInput,
  type CartValidationResult,
  type ValidatedCartLine,
} from "../lib/cartValidation";
import { lineMergeKey, type PricedAddon } from "../lib/orderLineMerge";
import { normalizeOrderNote } from "../lib/orderNote";
import { shownCancelReason } from "../lib/roundOutcome";
import { CartValidationService } from "./cartValidation.service";
import { PriceSnapshotService } from "./priceSnapshot.service";
import {
  OrderSessionService,
  isPastApprovalWindow,
} from "./orderService/orderSession.service";

type Tx = Prisma.TransactionClient;

type OpenRound = Awaited<
  ReturnType<typeof OrderSessionService.getOrStartCartRound>
>;

export type CartSubmitResult =
  | {
      status: "submitted";
      sessionId: number;
      orderNumber: string;
      /** The submitted round's cookie token — for the Server Action to
       *  point the Counter cookie at it. Never sent to the client. */
      sessionToken: string;
    }
  | { status: "needsScan" }
  | { status: "awaitingApproval" }
  | {
      status: "needsAttention" | "pricesChanged";
      validation: CartValidationResult;
    };

/** Something changed between the server-side check and the write (a
 *  price, or the round was taken by another submit) — the transaction
 *  rolls back and submit re-checks. Internal to this file. */
class CartChangedDuringSubmit extends Error {}
class RoundNoLongerOpen extends Error {}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** One order line to insert: identical cart lines (lineMergeKey) merged,
 *  priced from the snapshot taken inside the transaction. */
interface MergedLine {
  menuId: number;
  unitPrice: number;
  addons: PricedAddon[];
  note: string | null;
  quantity: number;
}

/**
 * Turns a browser-held Counter cart into a submitted order round. The
 * browser's own check is never trusted: the cart is validated again
 * here (validateCartLines via CartValidationService) and only an "ok"
 * decision writes anything. Idempotent by clientRequestId — a retried
 * submit (dropped response, double tap) returns the order the first one
 * created instead of creating a second.
 */
export class CartSubmitService {
  static async submit(input: {
    locationId: number;
    lines: readonly CartLineInput[];
    clientRequestId: string;
    sessionToken: string | null;
  }): Promise<CartSubmitResult> {
    const alreadySubmitted = await CartSubmitService.findSubmitted(
      input.clientRequestId,
    );
    if (alreadySubmitted) return alreadySubmitted;

    const session = await CartSubmitService.findSendingSession(
      input.sessionToken,
      input.locationId,
      "resolve",
    );
    if (!session) return { status: "needsScan" };
    if (await CartSubmitService.isBillAwaitingApproval(session)) {
      return { status: "awaitingApproval" };
    }

    const validation = await CartValidationService.validate(
      input.locationId,
      input.lines,
    );
    const decision = decideSubmit(validation);
    if (decision !== "ok") return { status: decision, validation };

    const round = await OrderSessionService.getOrStartCartRound(session);
    try {
      const submitted = await prisma.$transaction((tx: Tx) =>
        CartSubmitService.fillAndSubmitRound(
          tx,
          round,
          input.lines,
          validation.lines,
          input.clientRequestId,
        ),
      );
      return {
        status: "submitted",
        sessionId: submitted.id,
        orderNumber: submitted.orderNumber,
        sessionToken: submitted.token,
      };
    } catch (error) {
      return CartSubmitService.recoverFromFailedSubmit(error, input);
    }
  }

  /** The order a previous submit with this clientRequestId created, as
   *  a "submitted" result — null if there is none. Set only inside the
   *  submitting transaction, so a row carrying it WAS submitted. */
  private static async findSubmitted(
    clientRequestId: string,
  ): Promise<CartSubmitResult | null> {
    const session = await prisma.orderSession.findUnique({
      where: { clientRequestId },
      select: { id: true, orderNumber: true, token: true },
    });
    if (!session) return null;
    return {
      status: "submitted",
      sessionId: session.id,
      orderNumber: session.orderNumber,
      sessionToken: session.token,
    };
  }

  /** What became of the order a browser sent with this request id —
   *  so the cart page can learn, even later, that it was rejected or
   *  expired (by then the scan cookie may already be cleared). Read-only.
   *  The id is a random secret only that browser holds, and only the
   *  round's number and status come back. `cancelReason` is set only for
   *  a cancellation the customer is told about (see shownCancelReason). */
  static async getSubmittedOutcome(clientRequestId: string) {
    const session = await prisma.orderSession.findUnique({
      where: { clientRequestId },
      select: { id: true, orderNumber: true, status: true, cancelReason: true },
    });
    if (!session) return null;
    return {
      sessionId: session.id,
      orderNumber: session.orderNumber,
      status: session.status,
      cancelReason: shownCancelReason(session.status, session.cancelReason),
    };
  }

  /**
   * Whether this browser could send its cart now, WITHOUT writing
   * anything (the cart page asks on every check): "needsScan" with no
   * usable Counter session for this location, "awaitingApproval" while
   * the bill's latest round waits for the cashier, else "canSend". Same
   * rules and helpers as submit's own first checks — only through their
   * read-only twins (an abandoned cart or an overdue approval is judged,
   * not written).
   */
  static async getSendState(
    locationId: number,
    sessionToken: string | null,
  ): Promise<SendState> {
    const session = await CartSubmitService.findSendingSession(
      sessionToken,
      locationId,
      "peek",
    );
    if (!session) return "needsScan";
    const latestRound = await CartSubmitService.findLatestRound(session);
    const awaiting =
      latestRound?.status === "PENDING_APPROVAL" &&
      !isPastApprovalWindow(latestRound);
    return awaiting ? "awaitingApproval" : "canSend";
  }

  /** The customer's open Counter session for the cookie token — only if
   *  it's a Counter session at THIS location — resolved as the Counter
   *  flow does. When only this round has ended (a rejected/expired
   *  "Order More" round the cookie still points at), falls back to the
   *  bill's still-open first round, the same recovery
   *  pollOrderStatusAction does. "resolve" is submit's lookup
   *  (getActiveSessionByToken, which cancels an abandoned cart);
   *  "peek" its read-only twin. */
  private static async findSendingSession(
    token: string | null,
    locationId: number,
    lookup: "resolve" | "peek",
  ) {
    if (!token) return null;
    const active =
      lookup === "resolve"
        ? await OrderSessionService.getActiveSessionByToken(token)
        : await OrderSessionService.peekActiveSessionByToken(token);
    const session =
      active ??
      (await OrderSessionService.getSessionByToken(token).then((ended) =>
        ended ? OrderSessionService.getOpenBillRoot(ended) : null,
      ));
    const isThisShopsCounter =
      session?.isCounter === true && session.locationId === locationId;
    return isThisShopsCounter ? session : null;
  }

  /** The newest round of the session's bill. */
  private static async findLatestRound(session: {
    id: number;
    billSessionId: number | null;
  }) {
    const rootId = session.billSessionId ?? session.id;
    return prisma.orderSession.findFirst({
      where: {
        isArchived: false,
        OR: [{ id: rootId }, { billSessionId: rootId }],
      },
      orderBy: { id: "desc" },
      select: { id: true, status: true, approvalExpiresAt: true },
    });
  }

  /** The existing rule: no new round while the bill's latest round still
   *  awaits the cashier's decision. getSessionStatus expires an
   *  overdue approval on read, so a timed-out round doesn't block. */
  private static async isBillAwaitingApproval(session: {
    id: number;
    billSessionId: number | null;
  }) {
    const latestRound = await CartSubmitService.findLatestRound(session);
    if (latestRound?.status !== "PENDING_APPROVAL") return false;
    const current = await OrderSessionService.getSessionStatus(latestRound.id);
    return current.status === "PENDING_APPROVAL";
  }

  /**
   * The write, in ONE transaction:
   *  1. claim the CART round for this clientRequestId (only if it is
   *     still CART and unclaimed — a concurrent submit that got there
   *     first makes this match nothing);
   *  2. replace any lines left in the round from the old server-held
   *     cart — the browser cart is the whole order now;
   *  3. insert the cart's lines with price snapshots taken HERE
   *     (PriceSnapshotService), identical lines merged (lineMergeKey);
   *     a snapshot that differs from what was just validated means a
   *     price moved in between, so nothing is charged silently;
   *  4. the shared CART -> PENDING_APPROVAL step (stock decrement with
   *     its atomic guard, approval window).
   */
  private static async fillAndSubmitRound(
    tx: Tx,
    round: OpenRound,
    lines: readonly CartLineInput[],
    validated: readonly ValidatedCartLine[],
    clientRequestId: string,
  ) {
    if (!round.tableId) {
      throw new ValidationError("Order session has no table.");
    }
    const tableId = round.tableId;

    const claimed = await tx.orderSession.updateMany({
      where: {
        id: round.id,
        status: "CART",
        isArchived: false,
        clientRequestId: null,
      },
      data: { clientRequestId },
    });
    if (claimed.count === 0) throw new RoundNoLongerOpen();

    await tx.ordersAddon.deleteMany({
      where: { order: { orderSessionId: round.id } },
    });
    await tx.order.deleteMany({ where: { orderSessionId: round.id } });

    const merged = await CartSubmitService.priceAndMergeLines(
      tx,
      lines,
      validated,
    );
    for (const line of merged) {
      await tx.order.create({
        data: {
          menuId: line.menuId,
          quantity: line.quantity,
          tableId,
          orderSessionId: round.id,
          note: line.note,
          unitPrice: line.unitPrice,
          OrdersAddons: {
            create: line.addons.map(({ addonId, unitPrice }) => ({
              addonId,
              unitPrice,
            })),
          },
        },
      });
    }

    return OrderSessionService.submitCartRoundForApproval(tx, round);
  }

  /** Price snapshots for every line (one PriceSnapshotService lookup per
   *  distinct menu, not per line), checked against the validated prices,
   *  then identical lines merged by THE merge rule (lineMergeKey). The
   *  first line's note is kept, as when adding to a server cart. */
  private static async priceAndMergeLines(
    tx: Tx,
    lines: readonly CartLineInput[],
    validated: readonly ValidatedCartLine[],
  ) {
    const addonIdsByMenu = new Map<number, Set<number>>();
    for (const line of lines) {
      const ids = addonIdsByMenu.get(line.menuId) ?? new Set<number>();
      line.addonIds.forEach((id) => ids.add(id));
      addonIdsByMenu.set(line.menuId, ids);
    }
    const pricesByMenu = new Map<
      number,
      Awaited<ReturnType<typeof PriceSnapshotService.loadCurrentPrices>>
    >();
    for (const [menuId, addonIds] of addonIdsByMenu) {
      pricesByMenu.set(
        menuId,
        await PriceSnapshotService.loadCurrentPrices(tx, menuId, [...addonIds]),
      );
    }

    const merged = new Map<string, MergedLine>();
    lines.forEach((line, index) => {
      const { menuPrice, addonPrices } = pricesByMenu.get(line.menuId)!;
      const addons = [...new Set(line.addonIds)].map((addonId) => ({
        addonId,
        unitPrice: addonPrices.get(addonId)!,
      }));
      const checked = validated[index];
      const priceMoved =
        menuPrice !== checked.unitPrice ||
        addons.some(
          (addon, i) => addon.unitPrice !== checked.addonPrices[i],
        );
      if (priceMoved) throw new CartChangedDuringSubmit();

      const key = lineMergeKey(line.menuId, menuPrice, addons, line.note);
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += line.quantity;
      } else {
        merged.set(key, {
          menuId: line.menuId,
          unitPrice: menuPrice,
          addons,
          note: normalizeOrderNote(line.note),
          quantity: line.quantity,
        });
      }
    });
    return [...merged.values()];
  }

  /** Why the transaction rolled back decides the answer:
   *  - the same clientRequestId won a race (the claim found the round
   *    already taken, or its unique index rejected a second round) →
   *    that order, as "submitted";
   *  - the round was taken by a DIFFERENT submit → it's now awaiting
   *    approval;
   *  - stock ran out or a price moved since the check → a fresh
   *    validation, so the customer sees what changed.
   *  Anything else is a real error and is rethrown. */
  private static async recoverFromFailedSubmit(
    error: unknown,
    input: {
      locationId: number;
      lines: readonly CartLineInput[];
      clientRequestId: string;
    },
  ): Promise<CartSubmitResult> {
    if (isUniqueViolation(error) || error instanceof RoundNoLongerOpen) {
      const submitted = await CartSubmitService.findSubmitted(
        input.clientRequestId,
      );
      if (submitted) return submitted;
      if (error instanceof RoundNoLongerOpen) {
        return { status: "awaitingApproval" };
      }
    }
    if (
      error instanceof InsufficientStockError ||
      error instanceof CartChangedDuringSubmit
    ) {
      const validation = await CartValidationService.validate(
        input.locationId,
        input.lines,
      );
      const decision = decideSubmit(validation);
      // The write already failed, so never report "ok" here — at worst
      // the customer is asked to look at the cart once more.
      const status =
        decision === "pricesChanged" ? "pricesChanged" : "needsAttention";
      return { status, validation };
    }
    throw error;
  }
}
