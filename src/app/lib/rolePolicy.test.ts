import { describe, it, expect } from "vitest";
import { AppError } from "./errors";
import { ADDON_CHANGE_ROLES, OWNER_ONLY_MESSAGE, assertRole } from "./rolePolicy";

const session = (role: "ADMIN" | "MANAGER") => ({ companyId: 1, userId: 7, role });

function errorOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error;
  }
  return null;
}

describe("assertRole — add-on changes", () => {
  it("lets a MANAGER turn an add-on on or off", () => {
    expect(
      assertRole(session("MANAGER"), ADDON_CHANGE_ROLES.availability, OWNER_ONLY_MESSAGE),
    ).toEqual({ companyId: 1, userId: 7, role: "MANAGER" });
  });

  it("refuses a MANAGER changing a group's Required, as FORBIDDEN", () => {
    const error = errorOf(() =>
      assertRole(session("MANAGER"), ADDON_CHANGE_ROLES.required, OWNER_ONLY_MESSAGE),
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: "FORBIDDEN",
      message: "Only the owner can change this.",
    });
  });

  it("lets an ADMIN do both", () => {
    for (const roles of [ADDON_CHANGE_ROLES.availability, ADDON_CHANGE_ROLES.required]) {
      expect(assertRole(session("ADMIN"), roles, OWNER_ONLY_MESSAGE).role).toBe("ADMIN");
    }
  });
});

describe("assertRole — signed out", () => {
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
