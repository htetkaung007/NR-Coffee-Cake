import { describe, it, expect } from "vitest";
import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";
import {
  CANCEL_REASON_VALUES,
  ROUND_STATUS_VALUES,
  VOID_REASON_VALUES,
  isCustomerRoundStatus,
} from "./customerEnums";

const both = [
  ["en", en],
  ["my", my],
] as const;

describe("customer enum labels", () => {
  it("has words for every void reason, in both languages", () => {
    for (const [name, messages] of both) {
      for (const value of VOID_REASON_VALUES) {
        expect(messages.voidReason, `${name} voidReason.${value}`).toHaveProperty(value);
      }
    }
  });

  it("has words for every round status (and WITHDRAWN), in both languages", () => {
    for (const [name, messages] of both) {
      for (const value of ROUND_STATUS_VALUES) {
        expect(messages.roundStatus, `${name} roundStatus.${value}`).toHaveProperty(value);
      }
    }
  });

  it("has words for every cancel reason, in both languages", () => {
    for (const [name, messages] of both) {
      for (const value of CANCEL_REASON_VALUES) {
        expect(messages.cancelReason, `${name} cancelReason.${value}`).toHaveProperty(value);
      }
    }
  });
});

describe("isCustomerRoundStatus", () => {
  it("knows the order statuses and WITHDRAWN", () => {
    expect(isCustomerRoundStatus("COOKING")).toBe(true);
    expect(isCustomerRoundStatus("WITHDRAWN")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isCustomerRoundStatus("SOMETHING")).toBe(false);
  });
});
