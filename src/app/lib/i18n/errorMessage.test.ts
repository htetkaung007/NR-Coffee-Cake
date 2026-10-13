import { describe, it, expect } from "vitest";
import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";
import {
  CUSTOMER_ERROR_CODES,
  customerErrorMessage,
  type ErrorTranslator,
} from "./errorMessage";

/** A stand-in translator: "key" or "key{a=1}" — shows what was asked. */
const t: ErrorTranslator = (key, values) =>
  values ? `${key}${JSON.stringify(values)}` : key;

describe("customerErrorMessage", () => {
  it("uses the code's own message", () => {
    expect(customerErrorMessage({ code: "DRAFT_NOT_YOURS" }, t)).toBe("DRAFT_NOT_YOURS");
  });

  it("fills in the error's params", () => {
    expect(
      customerErrorMessage({ code: "LOW_STOCK", params: { name: "Latte", count: 2 } }, t),
    ).toBe('LOW_STOCK{"name":"Latte","count":2}');
  });

  it("falls back to the generic message for an unknown code", () => {
    expect(customerErrorMessage({ code: "SOMETHING_NEW" }, t)).toBe("generic");
  });

  it("never shows an unexpected server error's own text", () => {
    expect(customerErrorMessage({ code: "INTERNAL_ERROR" }, t)).toBe("generic");
  });
});

describe("customer error messages", () => {
  it("has a message for every customer error code, in both languages", () => {
    for (const code of CUSTOMER_ERROR_CODES) {
      expect(en.errors, `en errors.${code}`).toHaveProperty(code);
      expect(my.errors, `my errors.${code}`).toHaveProperty(code);
    }
  });

  it("has the generic fallback in both languages", () => {
    expect(en.errors.generic).toBeTruthy();
    expect(my.errors.generic).toBeTruthy();
  });
});
