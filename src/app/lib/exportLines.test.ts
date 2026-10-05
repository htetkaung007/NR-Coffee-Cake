import { describe, it, expect } from "vitest";
import {
  CANCELLED_LINE_HEADERS,
  LINE_HEADERS,
  SHARED_LINE_HEADERS,
  buildCancelledLineRows,
  buildLineRows,
  cancelledLinesCsv,
  exportFileName,
  linesCsv,
  sharedLineCells,
  type ExportBill,
  type ExportCancelledRound,
  type ExportLine,
} from "./exportLines";
import { periodFor } from "./reportPeriod";

const BOM = "﻿";
const at = (iso: string) => new Date(iso);

// Latte 2,000 + Extra shot 500, ×2 → 500 a unit in add-ons, 5,000 a line.
const latte: ExportLine = {
  id: 11,
  menuId: 3,
  menuName: "Latte",
  quantity: 2,
  unitPrice: 2000,
  addons: [{ name: "Extra shot", unitPrice: 500 }],
  note: null,
};

const plainLine = (overrides: Partial<ExportLine> = {}): ExportLine => ({
  id: 20,
  menuId: 5,
  menuName: "Espresso",
  quantity: 1,
  unitPrice: 1500,
  addons: [],
  note: null,
  ...overrides,
});

const bill = (overrides: Partial<ExportBill> = {}): ExportBill => ({
  id: 100,
  billNumber: "#A100",
  // 10:30 Yangon (UTC+6:30).
  paidAt: at("2026-10-04T04:00:00Z"),
  total: 5000,
  channel: "table",
  tableName: "T1",
  rounds: [
    { orderNumber: "#A100", createdAt: at("2026-10-04T03:00:00Z"), lines: [latte] },
  ],
  ...overrides,
});

const cancelledRound = (
  overrides: Partial<ExportCancelledRound> = {},
): ExportCancelledRound => ({
  orderNumber: "#A200",
  channel: "counter",
  tableName: null,
  cancelReason: "REJECTED",
  cancelledAt: at("2026-10-04T05:04:00Z"),
  cancellation: {
    // 11:00 → 11:34 Yangon.
    requestedAt: at("2026-10-04T04:30:00Z"),
    decidedAt: at("2026-10-04T05:04:00Z"),
    rejectReason: "OUT_OF_STOCK",
    note: null,
  },
  lines: [
    { ...latte, id: 31, isArchived: false },
    { ...plainLine({ id: 32 }), isArchived: false },
  ],
  ...overrides,
});

const pick = (row: object, headers: readonly string[]) =>
  Object.fromEntries(headers.map((header) => [header, (row as Record<string, unknown>)[header]]));

// ── Shared line columns ─────────────────────────────────────────────────

describe("sharedLineCells", () => {
  it("prices the worked example: Latte 2,000 + Extra shot 500, ×2", () => {
    expect(sharedLineCells(latte)).toEqual({
      menu_id: 3,
      menu: "Latte",
      quantity: 2,
      unit_price: 2000,
      addons: "Extra shot",
      addons_unit_total: 500,
      line_total: 5000,
      customer_note: null,
    });
  });

  it("joins two add-ons with ' + ' and sums them for one unit", () => {
    const cells = sharedLineCells({
      ...latte,
      quantity: 3,
      addons: [
        { name: "Extra shot", unitPrice: 500 },
        { name: "Oat milk", unitPrice: 700 },
      ],
    });
    expect(cells.addons).toBe("Extra shot + Oat milk");
    expect(cells.addons_unit_total).toBe(1200);
    expect(cells.line_total).toBe((2000 + 1200) * 3);
  });

  it("writes no add-on as empty text and 0", () => {
    const cells = sharedLineCells(plainLine());
    expect(cells.addons).toBe("");
    expect(cells.addons_unit_total).toBe(0);
    expect(cells.line_total).toBe(1500);
  });
});

// ── Paid lines ──────────────────────────────────────────────────────────

describe("buildLineRows", () => {
  it("writes one row per paid line, in LINE_HEADERS' columns", () => {
    const [row] = buildLineRows([bill()]);
    expect(Object.keys(row)).toEqual([...LINE_HEADERS]);
    expect(row).toEqual({
      line_id: 11,
      bill_id: 100,
      bill_number: "#A100",
      paid_date: "2026-10-04",
      paid_time: "10:30",
      channel: "Table",
      table: "T1",
      order_number: "#A100",
      round_no: 1,
      menu_id: 3,
      menu: "Latte",
      quantity: 2,
      unit_price: 2000,
      addons: "Extra shot",
      addons_unit_total: 500,
      line_total: 5000,
      customer_note: null,
    });
  });

  it("names a counter bill's channel and table both 'Counter'", () => {
    const [row] = buildLineRows([bill({ channel: "counter", tableName: null })]);
    expect(row.channel).toBe("Counter");
    expect(row.table).toBe("Counter");
  });

  it("files bills paid at 23:59 and 00:01 Yangon under different dates", () => {
    const rows = buildLineRows([
      bill({ id: 1, paidAt: at("2026-10-04T17:29:00Z") }),
      bill({ id: 2, paidAt: at("2026-10-04T17:31:00Z") }),
    ]);
    expect(rows.map((row) => [row.paid_date, row.paid_time])).toEqual([
      ["2026-10-04", "23:59"],
      ["2026-10-05", "00:01"],
    ]);
  });

  it("numbers the rounds of a bill 1, 2 by creation order, whatever the input order", () => {
    const rows = buildLineRows([
      bill({
        rounds: [
          {
            orderNumber: "#A102",
            createdAt: at("2026-10-04T03:30:00Z"),
            lines: [plainLine({ id: 22 })],
          },
          {
            orderNumber: "#A100",
            createdAt: at("2026-10-04T03:00:00Z"),
            lines: [latte],
          },
        ],
        total: 6500,
      }),
    ]);
    expect(rows.map((row) => [row.order_number, row.round_no])).toEqual([
      ["#A100", 1],
      ["#A102", 2],
    ]);
  });

  it("sorts by paid time, then order number, then line id", () => {
    const rows = buildLineRows([
      bill({
        id: 2,
        paidAt: at("2026-10-04T06:00:00Z"),
        rounds: [
          {
            orderNumber: "#A300",
            createdAt: at("2026-10-04T05:00:00Z"),
            lines: [plainLine({ id: 9 })],
          },
        ],
        total: 1500,
      }),
      bill({
        id: 1,
        paidAt: at("2026-10-04T04:00:00Z"),
        rounds: [
          {
            orderNumber: "#A100",
            createdAt: at("2026-10-04T03:00:00Z"),
            lines: [plainLine({ id: 8 }), plainLine({ id: 7 })],
          },
        ],
        total: 3000,
      }),
    ]);
    expect(rows.map((row) => row.line_id)).toEqual([7, 8, 9]);
  });

  it("adds up to the bill totals it was given", () => {
    const bills = [
      bill(),
      bill({
        id: 101,
        total: 1500 + 2 * (2000 + 500),
        rounds: [
          {
            orderNumber: "#A101",
            createdAt: at("2026-10-04T03:10:00Z"),
            lines: [plainLine({ id: 40 }), { ...latte, id: 41 }],
          },
        ],
      }),
    ];
    const sumOfLines = buildLineRows(bills).reduce((sum, row) => sum + row.line_total, 0);
    const sumOfBills = bills.reduce((sum, entry) => sum + entry.total, 0);
    expect(sumOfLines).toBe(sumOfBills);
  });
});

describe("linesCsv", () => {
  it("starts with the BOM and the header line in LINE_HEADERS order", () => {
    expect(linesCsv([])).toBe(`${BOM}${LINE_HEADERS.join(",")}\r\n`);
  });

  it("keeps a customer note with a comma, a newline and a leading '=' intact and safe", () => {
    const rows = buildLineRows([
      bill({
        rounds: [
          {
            orderNumber: "#A100",
            createdAt: at("2026-10-04T03:00:00Z"),
            lines: [{ ...latte, note: "=no sugar, please\nthanks" }],
          },
        ],
      }),
    ]);
    const lines = linesCsv(rows).split("\r\n");
    // The note's own newline stays inside its quoted cell (one record).
    expect(lines).toHaveLength(3);
    expect(lines[1].endsWith("\"'=no sugar, please\nthanks\"")).toBe(true);
  });
});

// ── Cancelled lines ─────────────────────────────────────────────────────

describe("buildCancelledLineRows", () => {
  it("repeats the round's status, reason and times on each of its lines", () => {
    const rows = buildCancelledLineRows([cancelledRound()]);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toMatchObject({
        order_number: "#A200",
        channel: "Counter",
        table: "Counter",
        status: "Rejected",
        reason: "Out of stock",
        cancel_note: null,
        submitted_date: "2026-10-04",
        submitted_time: "11:00",
        decided_time: "11:34",
        wait_seconds: 34 * 60,
      });
    }
  });

  it("writes rows in CANCELLED_LINE_HEADERS' columns", () => {
    const [row] = buildCancelledLineRows([cancelledRound()]);
    expect(Object.keys(row)).toEqual([...CANCELLED_LINE_HEADERS]);
  });

  it("keeps the cashier's Other note in cancel_note", () => {
    const [row] = buildCancelledLineRows([
      cancelledRound({
        cancellation: {
          requestedAt: at("2026-10-04T04:30:00Z"),
          decidedAt: at("2026-10-04T04:31:00Z"),
          rejectReason: "OTHER",
          note: "=machine broken, sorry",
        },
      }),
    ]);
    expect(row.reason).toBe("Other");
    expect(row.cancel_note).toBe("=machine broken, sorry");
  });

  it("encodes an Other note with a comma and a leading '=' safely", () => {
    const rows = buildCancelledLineRows([
      cancelledRound({
        cancellation: {
          requestedAt: at("2026-10-04T04:30:00Z"),
          decidedAt: at("2026-10-04T04:31:00Z"),
          rejectReason: "OTHER",
          note: "=machine broken, sorry",
        },
      }),
    ]);
    expect(cancelledLinesCsv(rows)).toContain(",\"'=machine broken, sorry\",");
  });

  it("writes a timeout with no reason, the deadline as decided_time and the window as the wait", () => {
    const [row] = buildCancelledLineRows([
      cancelledRound({
        cancelReason: "EXPIRED",
        cancellation: {
          requestedAt: at("2026-10-04T04:30:00Z"),
          // The deadline: 10 minutes later, 11:10 Yangon.
          decidedAt: at("2026-10-04T04:40:00Z"),
          rejectReason: null,
          note: null,
        },
      }),
    ]);
    expect(row).toMatchObject({
      status: "Timed out",
      reason: null,
      cancel_note: null,
      decided_time: "11:10",
      wait_seconds: 600,
    });
  });

  it("leaves the detail columns empty for a round with no cancellation row, but fills the line", () => {
    const [row] = buildCancelledLineRows([cancelledRound({ cancellation: null })]);
    expect(row).toMatchObject({
      status: "Rejected",
      reason: null,
      cancel_note: null,
      submitted_date: null,
      submitted_time: null,
      decided_time: null,
      wait_seconds: null,
      menu: "Latte",
      quantity: 2,
      line_total: 5000,
    });
  });

  it("prices add-ons on a cancelled line like any other line", () => {
    const [row] = buildCancelledLineRows([cancelledRound()]);
    expect(row).toMatchObject({
      addons: "Extra shot",
      addons_unit_total: 500,
      line_total: 5000,
    });
  });

  it("adds up to the round's value", () => {
    const rows = buildCancelledLineRows([cancelledRound()]);
    expect(rows.reduce((sum, row) => sum + row.line_total, 0)).toBe(5000 + 1500);
  });

  it("skips archived lines", () => {
    const rows = buildCancelledLineRows([
      cancelledRound({
        lines: [
          { ...latte, id: 31, isArchived: false },
          { ...plainLine({ id: 32 }), isArchived: true },
        ],
      }),
    ]);
    expect(rows.map((row) => row.line_id)).toEqual([31]);
  });

  it("ignores UNSUBMITTED rounds", () => {
    expect(
      buildCancelledLineRows([
        cancelledRound({ cancelReason: "UNSUBMITTED", cancellation: null }),
      ]),
    ).toEqual([]);
  });

  it("keeps customer_note and cancel_note in their own columns", () => {
    const [row] = buildCancelledLineRows([
      cancelledRound({
        cancellation: {
          requestedAt: at("2026-10-04T04:30:00Z"),
          decidedAt: at("2026-10-04T04:31:00Z"),
          rejectReason: "OTHER",
          note: "machine broken",
        },
        lines: [{ ...latte, id: 31, note: "no sugar", isArchived: false }],
      }),
    ]);
    expect(row.customer_note).toBe("no sugar");
    expect(row.cancel_note).toBe("machine broken");
  });

  it("sorts by decided time (cancel time without a row), then order number, then line id", () => {
    const rows = buildCancelledLineRows([
      cancelledRound({
        orderNumber: "#A300",
        cancelledAt: at("2026-10-04T08:00:00Z"),
        cancellation: null,
        lines: [{ ...plainLine({ id: 50 }), isArchived: false }],
      }),
      cancelledRound({
        orderNumber: "#A200",
        lines: [
          { ...plainLine({ id: 42 }), isArchived: false },
          { ...plainLine({ id: 41 }), isArchived: false },
        ],
      }),
    ]);
    expect(rows.map((row) => row.line_id)).toEqual([41, 42, 50]);
  });
});

describe("cancelledLinesCsv", () => {
  it("starts with the BOM and the header line in CANCELLED_LINE_HEADERS order", () => {
    expect(cancelledLinesCsv([])).toBe(`${BOM}${CANCELLED_LINE_HEADERS.join(",")}\r\n`);
  });
});

// ── The two files agree ─────────────────────────────────────────────────

describe("shared line columns", () => {
  it("are the same values in both files for the same line", () => {
    const line = { ...latte, note: "less ice" };
    const [paid] = buildLineRows([
      bill({
        rounds: [{ orderNumber: "#A100", createdAt: at("2026-10-04T03:00:00Z"), lines: [line] }],
      }),
    ]);
    const [cancelled] = buildCancelledLineRows([
      cancelledRound({ lines: [{ ...line, isArchived: false }] }),
    ]);
    expect(pick(cancelled, SHARED_LINE_HEADERS)).toEqual(pick(paid, SHARED_LINE_HEADERS));
  });

  it("end both files, in the same order", () => {
    expect(LINE_HEADERS.slice(-SHARED_LINE_HEADERS.length)).toEqual([...SHARED_LINE_HEADERS]);
    expect(CANCELLED_LINE_HEADERS.slice(-SHARED_LINE_HEADERS.length)).toEqual([
      ...SHARED_LINE_HEADERS,
    ]);
  });
});

describe("exportFileName", () => {
  it("names a month's files by year and month", () => {
    const month = periodFor("month", "2026-10-15");
    expect(exportFileName("lines", month)).toBe("sales-lines_2026-10.csv");
    expect(exportFileName("cancelled", month)).toBe("sales-cancelled_2026-10.csv");
  });

  it("names a week's files by its start day", () => {
    const week = periodFor("week", "2026-10-01");
    expect(exportFileName("lines", week)).toBe("sales-lines_2026-09-28_week.csv");
    expect(exportFileName("cancelled", week)).toBe("sales-cancelled_2026-09-28_week.csv");
  });
});
