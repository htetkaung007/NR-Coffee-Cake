import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The sign-up transaction with a stand-in client: every `tx.<model>.<method>`
 * is a vi.fn that resolves to a row with an id (company.count → 0, so
 * sign-up is open). Only the Default Table's row is asserted.
 */
const db = vi.hoisted(() => {
  const models = new Map<string, Record<string, ReturnType<typeof vi.fn>>>();
  const model = (name: string) => {
    if (!models.has(name)) {
      models.set(
        name,
        new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
          get(target, method: string) {
            target[method] ??= vi.fn(async () =>
              name === "company" && method === "count" ? 0 : { id: 1 },
            );
            return target[method];
          },
        }),
      );
    }
    return models.get(name)!;
  };
  const tx = new Proxy({}, { get: (_target, name: string) => model(name) });
  return {
    tx: tx as Record<string, Record<string, ReturnType<typeof vi.fn>>>,
    models,
    prisma: {
      $transaction: vi.fn((run: (client: unknown) => unknown) => run(tx)),
    },
  };
});

vi.mock("@/app/utils/prisma", () => ({ prisma: db.prisma }));
vi.mock("../utils/prisma", () => ({ prisma: db.prisma }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "hashed"), compare: vi.fn() },
}));

import { AppService } from "./app.service";

beforeEach(() => {
  db.models.clear();
});

async function signUp() {
  await AppService.createDefaultSetup(
    { name: "Owner", email: "owner@x.com" },
    "a-strong-password",
  );
  return db.tx.table.create.mock.calls[0][0].data;
}

describe("AppService.createDefaultSetup — the Default Table", () => {
  it("is a regular table (isCounter false), never null", async () => {
    const table = await signUp();
    expect(table).toMatchObject({ name: "Default Table", isCounter: false });
  });

  it("gets its own non-empty access key, so Create QR can build its QR", async () => {
    const table = await signUp();
    expect(typeof table.counterAccessKey).toBe("string");
    expect(table.counterAccessKey.length).toBeGreaterThan(0);
  });

  it("gets a different access key on every sign-up", async () => {
    const first = (await signUp()).counterAccessKey;
    db.models.clear();
    const second = (await signUp()).counterAccessKey;
    expect(second).not.toBe(first);
  });
});
