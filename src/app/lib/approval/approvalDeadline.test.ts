import { describe, it, expect } from "vitest";
import { approvalDeadline } from "./approvalDeadline";

const createdAt = new Date("2026-10-06T10:00:00Z");
const stored = new Date("2026-10-06T10:10:00Z");

describe("approvalDeadline", () => {
  it("gives a waiting Counter round its stored deadline, which auto-cancels", () => {
    expect(
      approvalDeadline({
        status: "PENDING_APPROVAL",
        isCounter: true,
        createdAt,
        approvalExpiresAt: stored,
      }),
    ).toEqual({ deadline: stored, autoCancels: true });
  });

  it("is null for a waiting Counter round without a stored deadline", () => {
    expect(
      approvalDeadline({
        status: "PENDING_APPROVAL",
        isCounter: true,
        createdAt,
        approvalExpiresAt: null,
      }),
    ).toBeNull();
  });

  it("gives a waiting Table round a soft deadline one window after it was sent", () => {
    expect(
      approvalDeadline({
        status: "PENDING_APPROVAL",
        isCounter: false,
        createdAt,
        approvalExpiresAt: null,
      }),
    ).toEqual({ deadline: new Date("2026-10-06T10:10:00Z"), autoCancels: false });
  });

  it("ignores a Table round's approvalExpiresAt even if one were set", () => {
    expect(
      approvalDeadline({
        status: "PENDING_APPROVAL",
        isCounter: false,
        createdAt,
        approvalExpiresAt: new Date("2026-10-06T10:02:00Z"),
      }),
    ).toEqual({ deadline: new Date("2026-10-06T10:10:00Z"), autoCancels: false });
  });

  it.each([["CART"], ["PENDING"], ["COOKING"], ["PAID"], ["CANCELLED"]])(
    "is null for a %s round",
    (status) => {
      expect(
        approvalDeadline({ status, isCounter: true, createdAt, approvalExpiresAt: stored }),
      ).toBeNull();
      expect(
        approvalDeadline({ status, isCounter: false, createdAt, approvalExpiresAt: null }),
      ).toBeNull();
    },
  );
});
