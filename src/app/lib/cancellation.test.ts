import { describe, it, expect } from "vitest";
import {
  deriveDecidedAt,
  deriveRequestedAt,
  formatDuration,
  toCancellationDetail,
  waitSeconds,
} from "./cancellation";

const at = (iso: string) => new Date(iso);
const session = (
  overrides: Partial<{
    approvalExpiresAt: Date | null;
    createdAt: Date;
    updateTime: Date;
    isCounter: boolean;
  }>,
) => ({
  approvalExpiresAt: null,
  createdAt: at("2026-10-05T09:00:00Z"),
  updateTime: at("2026-10-05T09:07:00Z"),
  isCounter: true,
  ...overrides,
});

describe("deriveRequestedAt", () => {
  it("is the deadline minus a 10-minute window", () => {
    const deadline = at("2026-10-05T09:20:00Z");
    expect(deriveRequestedAt(session({ approvalExpiresAt: deadline }), 10)).toEqual(
      at("2026-10-05T09:10:00Z"),
    );
  });

  it("follows the window it is given (15 minutes)", () => {
    const deadline = at("2026-10-05T09:20:00Z");
    expect(deriveRequestedAt(session({ approvalExpiresAt: deadline }), 15)).toEqual(
      at("2026-10-05T09:05:00Z"),
    );
  });

  it("uses the deadline even for a Table round when one is set", () => {
    const deadline = at("2026-10-05T09:20:00Z");
    expect(
      deriveRequestedAt(session({ approvalExpiresAt: deadline, isCounter: false }), 10),
    ).toEqual(at("2026-10-05T09:10:00Z"));
  });

  it("falls back to the last write for a Counter round with no deadline", () => {
    expect(deriveRequestedAt(session({ isCounter: true }), 10)).toEqual(
      at("2026-10-05T09:07:00Z"),
    );
  });

  it("falls back to creation for a Table round with no deadline (created at Send)", () => {
    expect(deriveRequestedAt(session({ isCounter: false }), 10)).toEqual(
      at("2026-10-05T09:00:00Z"),
    );
  });
});

describe("deriveDecidedAt", () => {
  const now = at("2026-10-05T09:30:00Z");
  const deadline = at("2026-10-05T09:20:00Z");

  it("is now for a rejection, whatever the deadline", () => {
    expect(deriveDecidedAt("REJECTED", deadline, now)).toEqual(now);
    expect(deriveDecidedAt("REJECTED", null, now)).toEqual(now);
  });

  it("is the deadline for an expiry, not when it was noticed", () => {
    expect(deriveDecidedAt("EXPIRED", deadline, now)).toEqual(deadline);
  });

  it("is now for an expiry with no deadline", () => {
    expect(deriveDecidedAt("EXPIRED", null, now)).toEqual(now);
  });
});

describe("waitSeconds", () => {
  const requested = at("2026-10-05T09:00:00.000Z");

  it("counts whole seconds between request and decision", () => {
    expect(waitSeconds(requested, at("2026-10-05T09:01:40.000Z"))).toBe(100);
  });

  it("rounds to the nearest second", () => {
    expect(waitSeconds(requested, at("2026-10-05T09:00:44.499Z"))).toBe(44);
    expect(waitSeconds(requested, at("2026-10-05T09:00:44.500Z"))).toBe(45);
  });

  it("is 0 when decided the moment it was requested", () => {
    expect(waitSeconds(requested, requested)).toBe(0);
  });

  it("is null when the decision is before the request", () => {
    expect(waitSeconds(requested, at("2026-10-05T08:59:59.000Z"))).toBeNull();
  });

  it("is null when either time is missing", () => {
    expect(waitSeconds(null, requested)).toBeNull();
    expect(waitSeconds(requested, null)).toBeNull();
    expect(waitSeconds(undefined, undefined)).toBeNull();
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0s"],
    [45, "45s"],
    [59, "59s"],
    [60, "1m"],
    [100, "1m 40s"],
    [720, "12m"],
    [3599, "59m 59s"],
    [3600, "1h 00m"],
    [3900, "1h 05m"],
    [3959, "1h 05m"],
    [7200, "2h 00m"],
  ])("writes %s seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it("writes a missing duration as a dash", () => {
    expect(formatDuration(null)).toBe("—");
  });

  it("writes a negative duration as a dash", () => {
    expect(formatDuration(-5)).toBe("—");
  });
});

describe("toCancellationDetail", () => {
  it("keeps the reason and turns the two times into the wait", () => {
    expect(
      toCancellationDetail({
        requestedAt: at("2026-10-05T09:00:00Z"),
        decidedAt: at("2026-10-05T09:04:20Z"),
        rejectReason: "OUT_OF_STOCK",
      }),
    ).toEqual({ rejectReason: "OUT_OF_STOCK", waitSeconds: 260 });
  });

  it("is null for a round with no cancellation row", () => {
    expect(toCancellationDetail(null)).toBeNull();
  });
});
