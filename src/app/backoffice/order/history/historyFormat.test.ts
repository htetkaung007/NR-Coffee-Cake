import { describe, it, expect } from "vitest";
import {
  formatCancelNoteLine,
  formatCancelReasonLabel,
  formatCancelWait,
} from "./historyFormat";

describe("formatCancelReasonLabel", () => {
  it("adds the cashier's reason to a recorded rejection", () => {
    expect(
      formatCancelReasonLabel("REJECTED", {
        rejectReason: "OUT_OF_STOCK",
        waitSeconds: 260,
        note: null,
      }),
    ).toBe("Rejected · Out of stock");
  });

  it("adds the computed wait to a recorded timeout", () => {
    expect(
      formatCancelReasonLabel("EXPIRED", { rejectReason: null, waitSeconds: 600, note: null }),
    ).toBe("Timed out · no decision in 10m");
  });

  it("keeps the plain label for rounds cancelled before recording began", () => {
    expect(formatCancelReasonLabel("REJECTED", null)).toBe("Rejected");
    expect(formatCancelReasonLabel("EXPIRED", null)).toBe("Timed out");
  });

  it("keeps the plain label when the detail itself is missing", () => {
    expect(
      formatCancelReasonLabel("REJECTED", { rejectReason: null, waitSeconds: 30, note: null }),
    ).toBe("Rejected");
    expect(
      formatCancelReasonLabel("EXPIRED", { rejectReason: null, waitSeconds: null, note: null }),
    ).toBe("Timed out");
  });
});

describe("formatCancelWait", () => {
  it("says how long a rejected round waited", () => {
    expect(
      formatCancelWait("REJECTED", { rejectReason: "OTHER", waitSeconds: 260, note: null }),
    ).toBe("Waited 4m 20s before it was rejected");
  });

  it("is null for a timeout (its label already says the wait)", () => {
    expect(
      formatCancelWait("EXPIRED", { rejectReason: null, waitSeconds: 600, note: null }),
    ).toBeNull();
  });

  it("is null without a recorded wait", () => {
    expect(formatCancelWait("REJECTED", null)).toBeNull();
    expect(
      formatCancelWait("REJECTED", { rejectReason: "OTHER", waitSeconds: null, note: null }),
    ).toBeNull();
  });
});

describe("formatCancelReasonLabel — Other with a note", () => {
  it("keeps the list row short: no note", () => {
    expect(
      formatCancelReasonLabel("REJECTED", {
        rejectReason: "OTHER",
        waitSeconds: 30,
        note: "coffee machine broken",
      }),
    ).toBe("Rejected · Other");
  });
});

describe("formatCancelNoteLine", () => {
  it("writes the reason and the cashier's note in full", () => {
    expect(
      formatCancelNoteLine("REJECTED", {
        rejectReason: "OTHER",
        waitSeconds: 30,
        note: "coffee machine broken",
      }),
    ).toBe("Rejected · Other — coffee machine broken");
  });

  it("is null for Other without a note", () => {
    expect(
      formatCancelNoteLine("REJECTED", { rejectReason: "OTHER", waitSeconds: 30, note: null }),
    ).toBeNull();
  });

  it("is null for any other reason, a timeout or no record", () => {
    expect(
      formatCancelNoteLine("REJECTED", {
        rejectReason: "OUT_OF_STOCK",
        waitSeconds: 30,
        note: "stray",
      }),
    ).toBeNull();
    expect(
      formatCancelNoteLine("EXPIRED", { rejectReason: null, waitSeconds: 600, note: null }),
    ).toBeNull();
    expect(formatCancelNoteLine("REJECTED", null)).toBeNull();
  });
});
