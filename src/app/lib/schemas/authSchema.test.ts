import { describe, it, expect } from "vitest";
import { loginSchema, newPasswordSchema } from "./authSchema";

describe("newPasswordSchema", () => {
  it("accepts 8 to 72 characters", () => {
    expect(newPasswordSchema.safeParse("a".repeat(8)).success).toBe(true);
    expect(newPasswordSchema.safeParse("a".repeat(72)).success).toBe(true);
  });

  it("refuses fewer than 8 characters", () => {
    expect(newPasswordSchema.safeParse("a".repeat(7)).success).toBe(false);
  });

  it("refuses more than 72 characters (bcrypt would ignore the rest)", () => {
    const result = newPasswordSchema.safeParse("a".repeat(73));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Password must be at most 72 characters.",
    );
  });

  it("refuses a password over 72 bytes even when under 72 characters", () => {
    // 25 Myanmar letters = 75 bytes in UTF-8.
    expect(newPasswordSchema.safeParse("က".repeat(25)).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("never caps the password, so older long passwords can still sign in", () => {
    const result = loginSchema.safeParse({
      email: "owner@example.com",
      password: "a".repeat(100),
    });
    expect(result.success).toBe(true);
  });
});
