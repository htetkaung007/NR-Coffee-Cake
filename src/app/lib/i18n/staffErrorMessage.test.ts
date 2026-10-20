import { describe, it, expect } from "vitest";
import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";
import {
  STAFF_ERROR_CODES,
  staffErrorMessage,
  type StaffErrorTranslator,
} from "./staffErrorMessage";

/** A stand-in translator: "key" or "key{a=1}" — shows what was asked. */
const t: StaffErrorTranslator = (key, values) =>
  values ? `${key}${JSON.stringify(values)}` : key;

describe("staffErrorMessage", () => {
  it("shows the server's own English message in English", () => {
    expect(
      staffErrorMessage({ message: "Email is already registered.", code: "EMAIL_TAKEN" }, "en", t),
    ).toBe("Email is already registered.");
  });

  it("uses the code's own words in Myanmar", () => {
    expect(staffErrorMessage({ message: "x", code: "FORBIDDEN" }, "my", t)).toBe("FORBIDDEN");
  });

  it("fills in the error's params in Myanmar", () => {
    expect(
      staffErrorMessage(
        { message: "x", code: "LOW_STOCK", params: { name: "Latte", count: 2 } },
        "my",
        t,
      ),
    ).toBe('LOW_STOCK{"name":"Latte","count":2}');
  });

  it("never shows the English message in Myanmar, even for an unknown code", () => {
    expect(
      staffErrorMessage({ message: "Something new broke.", code: "SOMETHING_NEW" }, "my", t),
    ).toBe("generic");
    expect(staffErrorMessage({ message: "Boom", code: "INTERNAL_ERROR" }, "my", t)).toBe(
      "generic",
    );
  });
});

describe("staff error messages", () => {
  it("has words for every staff error code, in both languages", () => {
    for (const code of STAFF_ERROR_CODES) {
      expect(en.bo.errors, `en bo.errors.${code}`).toHaveProperty(code);
      expect(my.bo.errors, `my bo.errors.${code}`).toHaveProperty(code);
    }
  });

  it("has no words for a code that isn't listed (each one is reachable)", () => {
    const listed = new Set<string>([...STAFF_ERROR_CODES, "generic"]);
    expect(Object.keys(en.bo.errors).filter((code) => !listed.has(code))).toEqual([]);
  });
});
