import { describe, it, expect } from "vitest";
import {
  cancelReasonLabel,
  describeWithdrawals,
  customerRoundStatus,
  SENT_CANCEL_REASONS,
  SHOP_MISSED_CANCEL_REASONS,
} from "./cancelReason";

describe("cancelReasonLabel", () => {
  it("tells staff the customer cancelled it themselves", () => {
    expect(cancelReasonLabel("WITHDRAWN", "staff")).toBe("Cancelled by customer");
  });

  it("tells the customer it was them", () => {
    expect(cancelReasonLabel("WITHDRAWN", "customer")).toBe("Cancelled by you");
  });

  it("keeps the shop's own reasons for staff", () => {
    expect(cancelReasonLabel("REJECTED", "staff")).toBe("Rejected");
    expect(cancelReasonLabel("EXPIRED", "staff")).toBe("Timed out");
  });

  it("shows nothing for a cart that was never sent, or no reason", () => {
    expect(cancelReasonLabel("UNSUBMITTED", "staff")).toBeNull();
    expect(cancelReasonLabel(null, "customer")).toBeNull();
  });
});

describe("the reason sets", () => {
  it("lists a withdrawn round with the other sent cancellations", () => {
    expect(SENT_CANCEL_REASONS).toContain("WITHDRAWN");
  });

  it("never counts a withdrawn round as the shop's miss", () => {
    expect(SHOP_MISSED_CANCEL_REASONS).not.toContain("WITHDRAWN");
  });
});

describe("customerRoundStatus", () => {
  it("shows a round the customer cancelled as WITHDRAWN", () => {
    expect(customerRoundStatus({ status: "CANCELLED", cancelReason: "WITHDRAWN" })).toBe(
      "WITHDRAWN",
    );
  });

  it("keeps every other status as it is", () => {
    expect(customerRoundStatus({ status: "COOKING", cancelReason: null })).toBe("COOKING");
    expect(customerRoundStatus({ status: "CANCELLED", cancelReason: "REJECTED" })).toBe(
      "CANCELLED",
    );
  });
});

describe("describeWithdrawals", () => {
  it("names a Counter order the customer cancelled", () => {
    expect(describeWithdrawals([{ orderNumber: "#A015", tableName: null }])).toBe(
      "Customer cancelled order #A015",
    );
  });

  it("adds the table for a Table order", () => {
    expect(describeWithdrawals([{ orderNumber: "#A016", tableName: "Table 3" }])).toBe(
      "Customer cancelled order #A016 · Table 3",
    );
  });

  it("combines several into one message", () => {
    expect(
      describeWithdrawals([
        { orderNumber: "#A015", tableName: null },
        { orderNumber: "#A016", tableName: "Table 3" },
      ]),
    ).toBe("Customers cancelled 2 orders");
  });
});
