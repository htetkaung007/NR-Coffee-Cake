import { describe, it, expect } from "vitest";
import { approvalTiming } from "./approvalTiming";

describe("approvalTiming", () => {
  const now = new Date("2026-10-05T10:00:00Z");

  it("gives a waiting Counter round its seconds left, window and deadline", () => {
    expect(
      approvalTiming(
        { status: "PENDING_APPROVAL", approvalExpiresAt: new Date("2026-10-05T10:07:30Z") },
        now,
      ),
    ).toEqual({
      secondsRemaining: 450,
      windowSeconds: 600,
      expiresAt: "2026-10-05T10:07:30.000Z",
      // Asia/Yangon is UTC+6:30.
      deadlineTime: "16:37",
    });
  });

  it("is null for a round with no deadline (a Table round) or not waiting", () => {
    expect(approvalTiming({ status: "PENDING_APPROVAL", approvalExpiresAt: null }, now)).toBeNull();
    expect(
      approvalTiming({ status: "PENDING", approvalExpiresAt: new Date("2026-10-05T10:07:30Z") }, now),
    ).toBeNull();
  });
});
