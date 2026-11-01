import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    user: { findUnique: vi.fn(), update: vi.fn() },
  };
  return {
    tx,
    prisma: {
      user: { findFirst: vi.fn(), updateMany: vi.fn() },
      $transaction: vi.fn((run: (client: typeof tx) => unknown) => run(tx)),
    },
    compare: vi.fn(),
  };
});

vi.mock("@/app/utils/prisma", () => ({ prisma: db.prisma }));
vi.mock("../utils/prisma", () => ({ prisma: db.prisma }));
vi.mock("bcryptjs", () => ({ default: { compare: db.compare } }));

import { LoginLockedError } from "../lib/errors";
import { AppService } from "./app.service";

const NOW = new Date("2026-11-01T10:00:00Z");
const CLEAR = { failedLoginCount: 0, firstFailedLoginAt: null, lockedUntil: null };
const user = (state: object = {}) => ({
  id: 7,
  email: "owner@x.com",
  password: "stored-hash",
  ...CLEAR,
  ...state,
});

/** A wrong attempt: the row as the transaction reads it under its lock. */
function rowUnderLock(state: object = {}) {
  db.tx.user.findUnique.mockResolvedValue({ ...CLEAR, ...state });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(NOW);
  db.prisma.$transaction.mockImplementation((run) => run(db.tx));
});

describe("AppService.verifyCredentials", () => {
  it("refuses a locked email and still runs one bcrypt compare", async () => {
    const lockedUntil = new Date(NOW.getTime() + 12 * 60_000);
    db.prisma.user.findFirst.mockResolvedValue(user({ lockedUntil }));

    await expect(AppService.verifyCredentials("owner@x.com", "right")).rejects.toMatchObject({
      name: "LoginLockedError",
      retryInMinutes: 12,
    });
    expect(db.compare).toHaveBeenCalledTimes(1);
  });

  it("never checks the real password while locked", async () => {
    const lockedUntil = new Date(NOW.getTime() + 60_000);
    db.prisma.user.findFirst.mockResolvedValue(user({ lockedUntil }));

    await expect(AppService.verifyCredentials("owner@x.com", "right")).rejects.toBeInstanceOf(
      LoginLockedError,
    );
    expect(db.compare).not.toHaveBeenCalledWith("right", "stored-hash");
  });

  it("records a wrong password under a row lock and returns null", async () => {
    db.prisma.user.findFirst.mockResolvedValue(user());
    db.compare.mockResolvedValue(false);
    rowUnderLock();

    await expect(AppService.verifyCredentials("owner@x.com", "wrong")).resolves.toBeNull();

    expect(db.tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.tx.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { failedLoginCount: 1, firstFailedLoginAt: NOW, lockedUntil: null },
    });
  });

  it("counts from the row read under the lock, so parallel failures both count", async () => {
    // Read before the other attempt committed: 0 failures. Under the lock: 2.
    db.prisma.user.findFirst.mockResolvedValue(user());
    db.compare.mockResolvedValue(false);
    rowUnderLock({ failedLoginCount: 2, firstFailedLoginAt: NOW });

    await expect(AppService.verifyCredentials("owner@x.com", "wrong")).rejects.toMatchObject({
      attemptsLeft: 2,
    });

    expect(db.tx.user.update.mock.calls[0][0].data.failedLoginCount).toBe(3);
  });

  it("warns once 3 tries are left", async () => {
    db.prisma.user.findFirst.mockResolvedValue(user());
    db.compare.mockResolvedValue(false);
    rowUnderLock({ failedLoginCount: 1, firstFailedLoginAt: NOW });

    await expect(AppService.verifyCredentials("owner@x.com", "wrong")).rejects.toMatchObject({
      name: "LoginAttemptsWarningError",
      attemptsLeft: 3,
    });
  });

  it("gives an unknown email the same warning as a real account", async () => {
    db.prisma.user.findFirst.mockResolvedValue(null);
    db.compare.mockResolvedValue(false);
    await expect(AppService.verifyCredentials("nobody-3@x.com", "any")).resolves.toBeNull();

    await expect(AppService.verifyCredentials("nobody-3@x.com", "any")).rejects.toMatchObject({
      attemptsLeft: 3,
    });
  });

  it("says locked straight away on the fifth wrong password", async () => {
    db.prisma.user.findFirst.mockResolvedValue(user());
    db.compare.mockResolvedValue(false);
    rowUnderLock({ failedLoginCount: 4, firstFailedLoginAt: NOW });

    await expect(AppService.verifyCredentials("owner@x.com", "wrong")).rejects.toMatchObject({
      retryInMinutes: 15,
    });
  });

  it("resets the counters on the correct password, in one statement", async () => {
    const found = user({ failedLoginCount: 3, firstFailedLoginAt: NOW });
    db.prisma.user.findFirst.mockResolvedValue(found);
    db.compare.mockResolvedValue(true);

    await expect(AppService.verifyCredentials("owner@x.com", "right")).resolves.toBe(found);

    expect(db.prisma.user.updateMany).toHaveBeenCalledTimes(1);
    expect(db.prisma.user.updateMany.mock.calls[0][0].data).toEqual(CLEAR);
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts the correct password once a lock has run out", async () => {
    const lockedUntil = new Date(NOW.getTime() - 1);
    db.prisma.user.findFirst.mockResolvedValue(user({ lockedUntil }));
    db.compare.mockResolvedValue(true);

    await expect(AppService.verifyCredentials("owner@x.com", "right")).resolves.toMatchObject({
      id: 7,
    });
  });

  it("runs one compare for an unknown email and writes nothing to the database", async () => {
    db.prisma.user.findFirst.mockResolvedValue(null);
    db.compare.mockResolvedValue(false);

    await expect(AppService.verifyCredentials("nobody-1@x.com", "any")).resolves.toBeNull();

    expect(db.compare).toHaveBeenCalledTimes(1);
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
    expect(db.prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("gives an unknown email the same lock as a real account", async () => {
    db.prisma.user.findFirst.mockResolvedValue(null);
    db.compare.mockResolvedValue(false);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await AppService.verifyCredentials("nobody-2@x.com", "any").catch(() => null);
    }

    await expect(AppService.verifyCredentials("nobody-2@x.com", "any")).rejects.toMatchObject({
      retryInMinutes: 15,
    });
    await expect(AppService.verifyCredentials("nobody-2@x.com", "any")).rejects.toBeInstanceOf(
      LoginLockedError,
    );
  });

  it("counts a Google-only account without ever accepting it", async () => {
    db.prisma.user.findFirst.mockResolvedValue(user({ password: null }));
    db.compare.mockResolvedValue(false);
    rowUnderLock();

    await expect(AppService.verifyCredentials("owner@x.com", "any")).resolves.toBeNull();
    expect(db.tx.user.update).toHaveBeenCalledTimes(1);
  });
});
