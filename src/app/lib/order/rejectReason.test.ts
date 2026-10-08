import { describe, it, expect } from "vitest";
import {
  REJECT_REASONS,
  formatRejectReasonCounts,
  isRejectReason,
  rejectReasonLabel,
  rejectReasonShortLabel,
  summarizeRejectReasons,
} from "./rejectReason";

describe("REJECT_REASONS", () => {
  it("lists every reason once, in the enum's order", () => {
    expect(REJECT_REASONS).toEqual([
      "OUT_OF_STOCK",
      "SUSPECTED_FAKE",
      "CUSTOMER_REQUEST",
      "OTHER",
    ]);
  });
});

describe("rejectReasonLabel", () => {
  it.each([
    ["OUT_OF_STOCK", "Out of stock"],
    ["SUSPECTED_FAKE", "Looks fake / customer not here"],
    ["CUSTOMER_REQUEST", "Customer asked to cancel"],
    ["OTHER", "Other"],
  ] as const)("names %s for staff as %s", (reason, label) => {
    expect(rejectReasonLabel(reason)).toBe(label);
  });
});

describe("isRejectReason", () => {
  it("accepts every reason", () => {
    for (const reason of REJECT_REASONS) expect(isRejectReason(reason)).toBe(true);
  });

  it.each([["out_of_stock"], [""], ["REJECTED"], [null], [undefined], [3]])(
    "rejects %s",
    (value) => {
      expect(isRejectReason(value)).toBe(false);
    },
  );
});

describe("rejectReasonShortLabel", () => {
  it.each([
    ["OUT_OF_STOCK", "Out of stock"],
    ["SUSPECTED_FAKE", "Looks fake"],
    ["CUSTOMER_REQUEST", "Customer asked"],
    ["OTHER", "Other"],
    ["NOT_RECORDED", "Not recorded"],
  ] as const)("shortens %s to %s", (reason, label) => {
    expect(rejectReasonShortLabel(reason)).toBe(label);
  });
});

const rejected = (rejectReason: string | null) => ({
  cancelReason: "REJECTED",
  cancellation: rejectReason === null ? null : { rejectReason },
});

describe("summarizeRejectReasons", () => {
  it("counts each reason over the rejected rounds", () => {
    const summary = summarizeRejectReasons([
      rejected("SUSPECTED_FAKE"),
      rejected("OUT_OF_STOCK"),
      rejected("SUSPECTED_FAKE"),
    ]);
    expect(summary).toEqual([
      { reason: "OUT_OF_STOCK", count: 1 },
      { reason: "SUSPECTED_FAKE", count: 2 },
      { reason: "CUSTOMER_REQUEST", count: 0 },
      { reason: "OTHER", count: 0 },
      { reason: "NOT_RECORDED", count: 0 },
    ]);
  });

  it("counts a rejected round with no cancellation row as Not recorded", () => {
    const summary = summarizeRejectReasons([rejected(null)]);
    expect(summary.find((entry) => entry.reason === "NOT_RECORDED")?.count).toBe(1);
  });

  it("counts a cancellation row without a reason as Not recorded", () => {
    const summary = summarizeRejectReasons([
      { cancelReason: "REJECTED", cancellation: { rejectReason: null } },
    ]);
    expect(summary.find((entry) => entry.reason === "NOT_RECORDED")?.count).toBe(1);
  });

  it("ignores rounds that weren't rejected", () => {
    const summary = summarizeRejectReasons([
      { cancelReason: "EXPIRED", cancellation: { rejectReason: null } },
      { cancelReason: "EXPIRED", cancellation: null },
    ]);
    expect(summary.every((entry) => entry.count === 0)).toBe(true);
  });

  it("is every bucket at zero for no rounds", () => {
    expect(summarizeRejectReasons([])).toEqual([
      { reason: "OUT_OF_STOCK", count: 0 },
      { reason: "SUSPECTED_FAKE", count: 0 },
      { reason: "CUSTOMER_REQUEST", count: 0 },
      { reason: "OTHER", count: 0 },
      { reason: "NOT_RECORDED", count: 0 },
    ]);
  });

  it("keeps REJECT_REASONS order, Not recorded last, whatever the input order", () => {
    const summary = summarizeRejectReasons([
      rejected(null),
      rejected("OTHER"),
      rejected("CUSTOMER_REQUEST"),
      rejected("OUT_OF_STOCK"),
    ]);
    expect(summary.map((entry) => entry.reason)).toEqual([
      ...REJECT_REASONS,
      "NOT_RECORDED",
    ]);
  });
});

describe("formatRejectReasonCounts", () => {
  it("lists only the non-zero reasons, in order", () => {
    expect(
      formatRejectReasonCounts([
        { reason: "OUT_OF_STOCK", count: 1 },
        { reason: "SUSPECTED_FAKE", count: 2 },
        { reason: "CUSTOMER_REQUEST", count: 0 },
        { reason: "OTHER", count: 0 },
        { reason: "NOT_RECORDED", count: 0 },
      ]),
    ).toBe("Out of stock 1 · Looks fake 2");
  });

  it("includes Not recorded only when it has rounds", () => {
    expect(
      formatRejectReasonCounts([
        { reason: "OTHER", count: 1 },
        { reason: "NOT_RECORDED", count: 3 },
      ]),
    ).toBe("Other 1 · Not recorded 3");
  });

  it("is empty when nothing was rejected", () => {
    expect(formatRejectReasonCounts([{ reason: "OTHER", count: 0 }])).toBe("");
  });
});
