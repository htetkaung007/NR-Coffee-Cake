import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import {
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "@/app/lib/errors";
import { canActAtLocation } from "@/app/lib/access/ownership";
import type { OrderTarget } from "@/app/lib/order/orderTarget";
import type { LocatedScope } from "@/app/lib/access/rolePolicy";
import {
  decideSubmit,
  type CartLineInput,
  type CartValidationResult,
} from "@/app/lib/cart/cartValidation";
import { CartValidationService } from "../cartValidation.service";
import {
  CartChangedDuringSubmit,
  CartSubmitService,
  isUniqueViolation,
} from "../cartSubmit.service";
import { TableService } from "../table.service";
import { OrderListService } from "./orderList.service";
import {
  generateOrderNumber,
  OrderSessionService,
} from "./orderSession.service";

type Tx = Prisma.TransactionClient;

/** A Counter bill a staff order can't join any more. */
const BILL_CLOSED_MESSAGE = "This bill is already closed";

export type StaffSubmitResult =
  | {
      status: "submitted";
      sessionId: number;
      orderNumber: string;
      /** The Order List entry it landed on (entryKeyFor) — where the
       *  page goes after sending onto an existing bill. */
      entryKey: string;
    }
  | {
      status: "needsAttention" | "pricesChanged";
      validation: CartValidationResult;
    };

/**
 * The staff New Order screen (Backoffice) sends a WHOLE order, once: the
 * cart is built in the browser (lib/cart/staffCart.ts) and nothing is
 * written until "Send to kitchen". Staff orders skip approval — staff ARE
 * the approver — so the round goes straight to PENDING.
 *
 * A staff round never touches Table.activeSessionId: that pointer is what
 * the customers' phones at the table show as "your round", and a cashier
 * ordering for the table must not hide it. The Order List, the bill and
 * mark-paid group a table's open rounds by tableId, not by that pointer.
 */
export class StaffOrderService {
  /**
   * Turns the browser's cart into a PENDING round for `target`
   * (lib/order/orderTarget), in ONE transaction — or writes nothing:
   *  - idempotent by clientRequestId (@unique, the Counter cart's
   *    pattern): a repeat — a double click, a retry after a dropped
   *    response — returns the order the first call created;
   *  - the target must be one `scope` may act at (resolveTarget): a
   *    table of its company (a manager's own location —
   *    TableService.getTableById), its location's counter, or an OPEN
   *    Counter bill of its company (findOpenCounterBill) — the new round
   *    joins that bill (billSessionId = its root), exactly as a
   *    customer's "Order More" does, so they're paid together;
   *  - checked like any browser cart (CartValidationService.validate at
   *    the target's location): a sold-out / short / unavailable line or a
   *    price the staff hasn't seen comes back with the check instead;
   *  - inside the transaction: a bill target is locked and re-checked
   *    still open (a payment that got there first makes this refuse
   *    "This bill is already closed"), then the round (never a cookie or
   *    contributor token), its lines priced from snapshots taken HERE (a
   *    price that moved since the check rolls back), and the stock
   *    decrement with its atomic guard (a shortage rolls back).
   */
  static async submitStaffOrder(input: {
    scope: LocatedScope;
    target: OrderTarget;
    lines: readonly CartLineInput[];
    clientRequestId: string;
  }): Promise<StaffSubmitResult> {
    const alreadySubmitted = await StaffOrderService.findSubmitted(
      input.clientRequestId,
      input.scope.companyId,
    );
    if (alreadySubmitted) return alreadySubmitted;

    const where = await StaffOrderService.resolveTarget(input.target, input.scope);
    const validation = await CartValidationService.validate(
      where.locationId,
      input.lines,
    );
    const decision = decideSubmit(validation);
    if (decision !== "ok") return { status: decision, validation };

    try {
      const round = await prisma.$transaction(async (tx: Tx) => {
        if (where.billSessionId !== null) {
          await StaffOrderService.lockOpenBill(tx, where.billSessionId);
        }
        const created = await tx.orderSession.create({
          data: {
            locationId: where.locationId,
            tableId: where.tableId,
            isCounter: where.isCounter,
            billSessionId: where.billSessionId,
            status: "PENDING",
            orderNumber: "",
            clientRequestId: input.clientRequestId,
          },
        });
        const merged = await CartSubmitService.priceAndMergeLines(
          tx,
          input.lines,
          validation.lines,
        );
        await CartSubmitService.writeLines(tx, {
          sessionId: created.id,
          tableId: where.tableId,
          lines: merged,
        });
        await OrderSessionService.decrementStockForSession(
          tx,
          created.id,
          where.locationId,
        );
        return tx.orderSession.update({
          where: { id: created.id },
          data: { orderNumber: generateOrderNumber(created.id) },
        });
      });
      return {
        status: "submitted",
        sessionId: round.id,
        orderNumber: round.orderNumber,
        entryKey: OrderListService.entryKeyFor(round),
      };
    } catch (error) {
      return StaffOrderService.recoverFromFailedSubmit(error, {
        ...input,
        locationId: where.locationId,
      });
    }
  }

  /** Where a target's round goes: its location and table, and the bill it
   *  joins (null: a bill of its own / the table's tab). Ownership checked
   *  for every kind — the same NotFoundError for "not there" and "not
   *  yours" (CLAUDE.md §13a). */
  private static async resolveTarget(target: OrderTarget, scope: LocatedScope) {
    switch (target.kind) {
      case "table": {
        const table = await TableService.getTableById(target.tableId, scope);
        return {
          locationId: table.locationId,
          tableId: table.id,
          isCounter: table.isCounter === true,
          billSessionId: null,
        };
      }
      case "counterNew": {
        const counter = await TableService.getCounterTable(scope);
        return {
          locationId: counter.locationId,
          tableId: counter.id,
          isCounter: true,
          billSessionId: null,
        };
      }
      case "counterBill": {
        const root = await StaffOrderService.findOpenCounterBill(
          target.billRootId,
          scope,
        );
        return {
          locationId: root.locationId,
          tableId: root.tableId,
          isCounter: true,
          billSessionId: root.id,
        };
      }
    }
  }

  /** Chain lookup — a Counter bill's first round (its root: no
   *  billSessionId of its own), if `scope` may act where it is
   *  (canActAtLocation; otherwise the same NotFoundError as a missing
   *  one), and the bill is still OPEN: not paid, not archived, and some
   *  round on it still awaiting approval, accepted or cooking. A paid,
   *  cancelled or archived bill is "This bill is already closed". */
  private static async findOpenCounterBill(billRootId: number, scope: LocatedScope) {
    const root = await prisma.orderSession.findFirst({
      where: {
        id: billRootId,
        isCounter: true,
        billSessionId: null,
        location: { companyId: scope.companyId },
      },
      include: { location: { select: { companyId: true } } },
    });
    if (
      !root ||
      root.tableId === null ||
      !canActAtLocation(scope, {
        companyId: root.location.companyId,
        locationId: root.locationId,
      })
    ) {
      throw new NotFoundError("Counter bill", billRootId);
    }
    const isOpen =
      !root.isArchived &&
      root.billId === null &&
      (await StaffOrderService.hasOpenRound(prisma, root.id));
    if (!isOpen) throw new ValidationError(BILL_CLOSED_MESSAGE);
    return { id: root.id, locationId: root.locationId, tableId: root.tableId };
  }

  /** Inside the send's transaction: lock the bill's root (a row write —
   *  markSessionsPaid locks its rounds the same way) and check it's
   *  still open, so a payment that got there first makes this send
   *  refuse instead of leaving a round on a paid bill. */
  private static async lockOpenBill(tx: Tx, billRootId: number) {
    const locked = await tx.orderSession.updateMany({
      where: { id: billRootId, billId: null, isArchived: false },
      data: { updateTime: new Date() },
    });
    const isOpen =
      locked.count > 0 && (await StaffOrderService.hasOpenRound(tx, billRootId));
    if (!isOpen) throw new ValidationError(BILL_CLOSED_MESSAGE);
  }

  /** Does the bill (its root and every round joined to it) still have a
   *  round awaiting approval, accepted or cooking — and none paid? */
  private static async hasOpenRound(db: Tx, billRootId: number) {
    const bill = { OR: [{ id: billRootId }, { billSessionId: billRootId }] };
    const [open, paid] = await Promise.all([
      db.orderSession.count({
        where: {
          ...bill,
          isArchived: false,
          status: { in: ["PENDING_APPROVAL", "PENDING", "COOKING"] },
        },
      }),
      db.orderSession.count({ where: { ...bill, billId: { not: null } } }),
    ]);
    return open > 0 && paid === 0;
  }

  /** The order a previous send with this clientRequestId created, as
   *  "submitted" — only within the staff's own company; null if none. */
  private static async findSubmitted(
    clientRequestId: string,
    companyId: number,
  ): Promise<StaffSubmitResult | null> {
    const round = await prisma.orderSession.findFirst({
      where: { clientRequestId, location: { companyId } },
      select: {
        id: true,
        orderNumber: true,
        tableId: true,
        isCounter: true,
        billSessionId: true,
      },
    });
    return round
      ? {
          status: "submitted",
          sessionId: round.id,
          orderNumber: round.orderNumber,
          entryKey: OrderListService.entryKeyFor(round),
        }
      : null;
  }

  /** Why the transaction rolled back decides the answer:
   *  - the same clientRequestId won a race (its unique index refused
   *    this one) → that order, as "submitted";
   *  - stock ran out or a price moved since the check → a fresh check,
   *    so the staff see what changed (never "ok" — nothing was written).
   *  Anything else is a real error and is rethrown. */
  private static async recoverFromFailedSubmit(
    error: unknown,
    input: {
      scope: LocatedScope;
      locationId: number;
      lines: readonly CartLineInput[];
      clientRequestId: string;
    },
  ): Promise<StaffSubmitResult> {
    if (isUniqueViolation(error)) {
      const submitted = await StaffOrderService.findSubmitted(
        input.clientRequestId,
        input.scope.companyId,
      );
      if (submitted) return submitted;
    }
    if (
      error instanceof InsufficientStockError ||
      error instanceof CartChangedDuringSubmit
    ) {
      const validation = await CartValidationService.validate(
        input.locationId,
        input.lines,
      );
      const status =
        decideSubmit(validation) === "pricesChanged"
          ? "pricesChanged"
          : "needsAttention";
      return { status, validation };
    }
    throw error;
  }
}
