import { describe, it, expect } from "vitest";
import { AppError } from "./errors";
import { assertRole } from "./rolePolicy";

const session = (role: "ADMIN" | "MANAGER") => ({ companyId: 1, userId: 7, role });

function errorOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error;
  }
  return null;
}

describe("assertRole", () => {
  it("returns the scope for an allowed role", () => {
    expect(assertRole(session("MANAGER"), ["ADMIN", "MANAGER"], "nope")).toEqual({
      companyId: 1,
      userId: 7,
      role: "MANAGER",
    });
  });

  it("refuses a role that isn't allowed, as FORBIDDEN with the given message", () => {
    const error = errorOf(() => assertRole(session("MANAGER"), ["ADMIN"], "Owner only."));
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: "FORBIDDEN", message: "Owner only." });
  });

  it.each([
    [{ companyId: null, userId: 7, role: "ADMIN" as const }],
    [{ companyId: 1, userId: null, role: "ADMIN" as const }],
  ])("refuses %j as UNAUTHORIZED", (signedOut) => {
    expect(errorOf(() => assertRole(signedOut, ["ADMIN"], "nope"))).toMatchObject({
      code: "UNAUTHORIZED",
      message: "You must be signed in.",
    });
  });
});
