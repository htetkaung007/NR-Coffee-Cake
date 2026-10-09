import { describe, it, expect, vi, beforeEach } from "vitest";

// A fake Prisma client: the number of existing companies is set per test,
// and every write is recorded, so the tests can check that a closed
// sign-up creates nothing at all.
const { state, writes } = vi.hoisted(() => ({
  state: { companies: 0, existingUser: null as { id: number } | null },
  writes: [] as string[],
}));

vi.mock("@/app/utils/prisma", () => {
  const record =
    (name: string, row: Record<string, unknown> = {}) =>
    async () => {
      writes.push(name);
      return { id: writes.length, ...row };
    };
  const tx = {
    company: { count: async () => state.companies, create: record("company.create") },
    user: { create: record("user.create") },
    menuCategory: { create: record("menuCategory.create") },
    menu: { create: record("menu.create") },
    menuMenuCategory: { create: record("menuMenuCategory.create") },
    addonCategories: { create: record("addonCategories.create") },
    menuAddonCategories: { create: record("menuAddonCategories.create") },
    addon: { createMany: record("addon.createMany") },
    location: { create: record("location.create") },
    selectedLocation: { create: record("selectedLocation.create") },
    menuStock: { create: record("menuStock.create") },
    table: { create: record("table.create") },
  };
  return {
    prisma: {
      company: { count: async () => state.companies },
      user: { findFirst: async () => state.existingUser },
      $transaction: async (run: (client: typeof tx) => unknown) => run(tx),
    },
  };
});

import { AppService } from "./app.service";

const CLOSED = {
  code: "SIGNUP_CLOSED",
  message: "Sign-up is closed. Ask the shop owner for an account.",
};

beforeEach(() => {
  state.companies = 0;
  state.existingUser = null;
  writes.length = 0;
});

describe("isSignUpOpen", () => {
  it("is open while no company exists", async () => {
    await expect(AppService.isSignUpOpen()).resolves.toBe(true);
  });

  it("is closed once a company exists", async () => {
    state.companies = 1;
    await expect(AppService.isSignUpOpen()).resolves.toBe(false);
  });
});

describe("createDefaultSetup (the one door for the form and Google)", () => {
  it("creates the first company while sign-up is open", async () => {
    await AppService.createDefaultSetup({ name: "Owner", email: "owner@example.com" });
    expect(writes[0]).toBe("company.create");
  });

  it("refuses with SIGNUP_CLOSED and writes nothing once a company exists", async () => {
    state.companies = 1;
    await expect(
      AppService.createDefaultSetup({ email: "stranger@example.com" }),
    ).rejects.toMatchObject(CLOSED);
    expect(writes).toEqual([]);
  });
});

describe("registerUser", () => {
  it("refuses with SIGNUP_CLOSED before saying whether the email is registered", async () => {
    state.companies = 1;
    state.existingUser = { id: 1 };
    await expect(
      AppService.registerUser({
        name: "Stranger",
        email: "owner@example.com",
        password: "secret123",
      }),
    ).rejects.toMatchObject(CLOSED);
    expect(writes).toEqual([]);
  });
});
