import { describe, it, expect } from "vitest";
import { createTranslator } from "next-intl";
import en from "../../../../../messages/en.json";
import {
  formatCancelNoteLine,
  formatCancelReasonLabel as formatCancelReasonLabelIn,
  formatCancelWait as formatCancelWaitIn,
  formatDayLabel,
  type HistoryWords,
} from "./historyFormat";

/** The English words, from en.json — what the History page shows. */
const t = createTranslator({ locale: "en", messages: en, namespace: "bo.history" });
const tReason = createTranslator({ locale: "en", messages: en, namespace: "bo.rejectReason" });
const words: HistoryWords = {
  today: t("today"),
  yesterday: t("yesterday"),
  weekday: (day) => `weekday(${day})`,
  dayDate: (day) => `date(${day})`,
  shopDate: (iso) => iso,
  clockTime: (iso) => iso,
  minutes: (minutes) => t("minutes", { minutes }),
  cancelReason: (reason) => t(`cancelReason.${reason}`),
  rejectReason: (reason) => tReason(reason),
  rejectedWith: (reason) => t("rejectedWith", { reason }),
  timedOutAfter: (duration) => t("timedOutAfter", { duration }),
  waited: (duration) => t("waited", { duration }),
  durationUnits: {
    seconds: (seconds) => t("durationSeconds", { seconds }),
    minutes: (minutes) => t("durationMinutes", { minutes }),
    minutesSeconds: (minutes, seconds) => t("durationMinutesSeconds", { minutes, seconds }),
    hoursMinutes: (hours, minutes) => t("durationHoursMinutes", { hours, minutes }),
  },
};
const formatCancelReasonLabel = (
  ...args: [reason: string, cancellation: Parameters<typeof formatCancelReasonLabelIn>[1]]
) => formatCancelReasonLabelIn(...args, words);
const formatCancelWait = (
  ...args: [reason: string, cancellation: Parameters<typeof formatCancelWaitIn>[1]]
) => formatCancelWaitIn(...args, words);

describe("formatDayLabel", () => {
  it("says Today and Yesterday on the shop's calendar, and always the date", () => {
    expect(formatDayLabel("2026-10-20", "2026-10-20", words)).toEqual({
      primary: "Today",
      secondary: "date(2026-10-20)",
    });
    expect(formatDayLabel("2026-09-30", "2026-10-01", words).primary).toBe("Yesterday");
  });

  it("uses the weekday for any other day", () => {
    expect(formatDayLabel("2026-10-15", "2026-10-20", words).primary).toBe(
      "weekday(2026-10-15)",
    );
  });
});

describe("formatCancelReasonLabel", () => {
  it("says the customer cancelled a withdrawn round, whatever was recorded", () => {
    expect(
      formatCancelReasonLabel("WITHDRAWN", {
        rejectReason: null,
        waitSeconds: 40,
        note: null,
      }),
    ).toBe("Cancelled by customer");
  });

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
      }, words),
    ).toBe("Rejected · Other — coffee machine broken");
  });

  it("is null for Other without a note", () => {
    expect(
      formatCancelNoteLine("REJECTED", { rejectReason: "OTHER", waitSeconds: 30, note: null }, words),
    ).toBeNull();
  });

  it("is null for any other reason, a timeout or no record", () => {
    expect(
      formatCancelNoteLine("REJECTED", {
        rejectReason: "OUT_OF_STOCK",
        waitSeconds: 30,
        note: "stray",
      }, words),
    ).toBeNull();
    expect(
      formatCancelNoteLine("EXPIRED", { rejectReason: null, waitSeconds: 600, note: null }, words),
    ).toBeNull();
    expect(formatCancelNoteLine("REJECTED", null, words)).toBeNull();
  });
});
