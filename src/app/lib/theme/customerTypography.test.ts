import { describe, it, expect } from "vitest";
import {
  CUSTOMER_TEXT_PX,
  customerTypographyOverrides,
  pxToRem,
  sizeToPx,
} from "./customerTypography";
import { sharedThemeOptions } from "./sharedThemeTokens";

const shared = sharedThemeOptions.typography as Record<string, unknown>;
const overrides = customerTypographyOverrides(shared);

describe("CUSTOMER_TEXT_PX", () => {
  it("is the owner's one-step-bigger phone scale", () => {
    expect(CUSTOMER_TEXT_PX).toEqual({
      caption: 13,
      body2: 15,
      body1: 16,
      subtitle2: 15,
      subtitle1: 16,
      button: 15,
    });
  });

  it("keeps field text (body1) at 16px or more — no iOS focus zoom", () => {
    expect(CUSTOMER_TEXT_PX.body1).toBeGreaterThanOrEqual(16);
  });
});

describe("customerTypographyOverrides", () => {
  it("sets each variant's phone size in rem", () => {
    expect(overrides.caption.fontSize).toBe("0.8125rem");
    expect(overrides.body1.fontSize).toBe("1rem");
  });

  it("raises a smaller wider-screen size to the phone size", () => {
    // shared body2 from sm: 0.85rem (13.6px) → 15px.
    expect(overrides.body2["@media (min-width:600px)"]).toEqual({ fontSize: "0.9375rem" });
  });

  it("keeps a wider-screen size that is already bigger", () => {
    // shared subtitle1 from md: 1.2rem (19.2px) stays.
    expect(overrides.subtitle1["@media (min-width:900px)"]).toEqual({ fontSize: "1.2rem" });
  });

  it("never leaves a wider-screen size smaller than the phone size", () => {
    for (const [variant, rule] of Object.entries(overrides)) {
      const phone = CUSTOMER_TEXT_PX[variant as keyof typeof CUSTOMER_TEXT_PX];
      for (const [key, value] of Object.entries(rule)) {
        if (!key.startsWith("@media")) continue;
        expect(sizeToPx((value as { fontSize: unknown }).fontSize)).toBeGreaterThanOrEqual(phone);
      }
    }
  });

  it("covers every wider-screen size the shared scale sets", () => {
    for (const variant of Object.keys(CUSTOMER_TEXT_PX)) {
      const mediaKeys = Object.keys(shared[variant] as object).filter((key) =>
        key.startsWith("@media"),
      );
      for (const key of mediaKeys) {
        expect(overrides[variant as keyof typeof overrides][key]).toBeDefined();
      }
    }
  });
});

describe("pxToRem / sizeToPx", () => {
  it("round-trips px and rem", () => {
    expect(pxToRem(13)).toBe("0.8125rem");
    expect(sizeToPx("0.95rem")).toBeCloseTo(15.2);
    expect(sizeToPx("14px")).toBe(14);
    expect(sizeToPx(12)).toBe(12);
    expect(sizeToPx("calc(1rem * 2)")).toBeNull();
  });
});
