import { describe, it, expect, vi } from "vitest";

// isPastApprovalWindow is pure, but its module imports the Prisma client
// (built on import) — stub it, as in menuCategory.service.test.ts.
vi.mock("@/app/utils/prisma", () => ({ prisma: {} }));

import { isPastApprovalWindow } from "./orderSession.service";

const NOW = new Date("2026-09-30T10:00:00Z");
const BEFORE = new Date("2026-09-30T09:59:00Z");
const AFTER = new Date("2026-09-30T10:01:00Z");

describe("isPastApprovalWindow", () => {
  it("is true for a round still awaiting approval after its window ended", () => {
    expect(
      isPastApprovalWindow(
        { status: "PENDING_APPROVAL", approvalExpiresAt: BEFORE },
        NOW,
      ),
    ).toBe(true);
  });

  it("is false while the approval window is still open", () => {
    expect(
      isPastApprovalWindow(
        { status: "PENDING_APPROVAL", approvalExpiresAt: AFTER },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false for a round that has no approval window", () => {
    expect(
      isPastApprovalWindow(
        { status: "PENDING_APPROVAL", approvalExpiresAt: null },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false once the counter has decided, whatever the old window said", () => {
    expect(
      isPastApprovalWindow({ status: "PENDING", approvalExpiresAt: BEFORE }, NOW),
    ).toBe(false);
  });
});
