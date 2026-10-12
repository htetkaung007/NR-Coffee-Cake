import { buildEntryBill, type BillSourceRound } from "./orderTotals";
import { isSessionTerminal } from "./sessionStatus";
import { parseTargetKey } from "./orderTarget";

/** A round as the occupancy rule reads it — the bill's round, plus whose
 *  it is (a Counter round is never a table's, even on the counter's own
 *  table row). */
export type OccupancyRound<Time> = BillSourceRound<Time> & {
  tableId: number | null;
  isCounter: boolean;
};

export interface TableOccupancy {
  tableId: number;
  status: "inUse" | "free";
  /** Open rounds (sent, not yet paid, not cancelled). */
  openOrderCount: number;
  /** What the table's bill shows so far: its accepted rounds only — the
   *  bill's own rule (buildEntryBill). */
  unpaidTotal: number;
  /** One of its rounds is still waiting for the counter's decision. */
  hasPendingApproval: boolean;
}

/**
 * THE rule for whether a table is taken — what the staff New Order's
 * "Order for" picker shows, however the orders got there (customer Table
 * QR or staff). A table is IN USE when it has:
 * - an open round with lines — not paid, rejected or expired
 *   (isSessionTerminal) and not an empty cart; or
 * - a customer Table draft with at least one line (`tablesWithDraft`).
 * Otherwise FREE. The counter has no occupancy: it's left out (always
 * selectable). Pure.
 */
export function tableOccupancy<Time>(input: {
  tables: readonly { id: number; isCounter: boolean }[];
  rounds: readonly OccupancyRound<Time>[];
  tablesWithDraft: readonly number[];
}): TableOccupancy[] {
  const hasDraft = new Set(input.tablesWithDraft);
  return input.tables
    .filter((table) => !table.isCounter)
    .map((table) => {
      const open = input.rounds.filter(
        (round) =>
          !round.isCounter &&
          round.tableId === table.id &&
          !isSessionTerminal(round.status) &&
          round.orders.length > 0,
      );
      const inUse = open.length > 0 || hasDraft.has(table.id);
      return {
        tableId: table.id,
        status: inUse ? "inUse" : "free",
        openOrderCount: open.length,
        unpaidTotal: buildEntryBill([...open]).total,
        hasPendingApproval: open.some(
          (round) => round.status === "PENDING_APPROVAL",
        ),
      };
    });
}

/** An unpaid Counter bill a staff order can be added to. */
export interface CounterBillOccupancy {
  /** The bill's first round — what a new round links to (billSessionId). */
  billRootId: number;
  /** The bill's number ("#A012") — as the Order List card shows it. */
  title: string;
  /** Open rounds on it. */
  openOrderCount: number;
  /** What its bill shows so far — accepted rounds only, voids left out
   *  (buildEntryBill, the bill's own rule). */
  unpaidTotal: number;
  hasPendingApproval: boolean;
}

/** The open Counter bills, from the Order List's own entries (one per
 *  bill — a Counter entry's key is "counter-<root id>"), in its order.
 *  Table entries are left out. Pure. */
export function counterBillOccupancy<Time>(
  entries: readonly {
    key: string;
    title: string;
    isTableGroup: boolean;
    sessions: readonly BillSourceRound<Time>[];
  }[],
): CounterBillOccupancy[] {
  return entries.flatMap((entry) => {
    const target = entry.isTableGroup ? null : parseTargetKey(entry.key);
    if (target?.kind !== "counterBill") return [];
    return [
      {
        billRootId: target.billRootId,
        title: entry.title,
        openOrderCount: entry.sessions.length,
        unpaidTotal: buildEntryBill([...entry.sessions]).total,
        hasPendingApproval: entry.sessions.some(
          (session) => session.status === "PENDING_APPROVAL",
        ),
      },
    ];
  });
}
