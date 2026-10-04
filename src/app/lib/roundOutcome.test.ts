import { describe, it, expect } from "vitest";
import { shownCancelReason } from "./roundOutcome";

describe("shownCancelReason", () => {
  it("tells the customer about a round the counter rejected", () => {
    expect(shownCancelReason("CANCELLED", "REJECTED")).toBe("REJECTED");
  });

  it("tells the customer about a round nobody confirmed in time", () => {
    expect(shownCancelReason("CANCELLED", "EXPIRED")).toBe("EXPIRED");
  });

  it("stays quiet about a cart that was never sent", () => {
    expect(shownCancelReason("CANCELLED", "UNSUBMITTED")).toBeNull();
  });

  it("stays quiet about a cancelled round with no recorded reason", () => {
    expect(shownCancelReason("CANCELLED", null)).toBeNull();
  });

  it("stays quiet about any round that isn't cancelled", () => {
    expect(shownCancelReason("PENDING", "REJECTED")).toBeNull();
    expect(shownCancelReason("PAID", null)).toBeNull();
  });
});
