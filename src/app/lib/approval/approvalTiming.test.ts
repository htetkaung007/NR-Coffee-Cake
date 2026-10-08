import { describe, it, expect } from "vitest";
import { approvalTiming } from "./approvalTiming";

describe("approvalTiming", () => {
  const now = new Date("2026-10-05T10:00:00Z");

  it("gives a waiting Counter round its seconds left, window and deadline", () => {
    expect(
      approvalTiming(
        {
          status: "PENDING_APPROVAL",
          isCounter: true,
          createdAt: new Date("2026-10-05T09:57:30Z"),
          approvalExpiresAt: new Date("2026-10-05T10:07:30Z"),
        },
        now,
      ),
    ).toEqual({
      secondsRemaining: 450,
      windowSeconds: 600,
      expiresAt: "2026-10-05T10:07:30.000Z",
      // Asia/Yangon is UTC+6:30.
      deadlineTime: "16:37",
      autoCancels: true,
    });
  });

  it("is null for a Counter round with no deadline, or a round not waiting", () => {
    expect(
      approvalTiming(
        {
          status: "PENDING_APPROVAL",
          isCounter: true,
          createdAt: now,
          approvalExpiresAt: null,
        },
        now,
      ),
    ).toBeNull();
    expect(
      approvalTiming(
        {
          status: "PENDING",
          isCounter: true,
          createdAt: now,
          approvalExpiresAt: new Date("2026-10-05T10:07:30Z"),
        },
        now,
      ),
    ).toBeNull();
  });

  it("gives a waiting Table round a soft deadline from when it was sent", () => {
    expect(
      approvalTiming(
        {
          status: "PENDING_APPROVAL",
          isCounter: false,
          // Sent 4 minutes ago: 6 minutes of the 10-minute window left.
          createdAt: new Date("2026-10-05T09:56:00Z"),
          approvalExpiresAt: null,
        },
        now,
      ),
    ).toEqual({
      secondsRemaining: 360,
      windowSeconds: 600,
      expiresAt: "2026-10-05T10:06:00.000Z",
      deadlineTime: "16:36",
      autoCancels: false,
    });
  });

  it("goes negative for a Table round past its soft deadline (overdue, not cancelled)", () => {
    const timing = approvalTiming(
      {
        status: "PENDING_APPROVAL",
        isCounter: false,
        createdAt: new Date("2026-10-05T09:40:00Z"),
        approvalExpiresAt: null,
      },
      now,
    );
    // Sent 20 minutes ago: 10 minutes past the 10-minute target.
    expect(timing?.secondsRemaining).toBe(-600);
    expect(timing?.autoCancels).toBe(false);
  });
});
