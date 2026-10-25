import { describe, expect, it } from "vitest";
import { createSubmitLock } from "./submitLock";

/** A task that waits until the test lets it finish. */
function deferredTask() {
  let finish!: () => void;
  let fail!: (error: Error) => void;
  const done = new Promise<void>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  let calls = 0;
  const task = () => {
    calls += 1;
    return done;
  };
  return { task, finish, fail, calls: () => calls };
}

describe("createSubmitLock", () => {
  it("locks synchronously, before the task is awaited", () => {
    const lock = createSubmitLock();
    const { task } = deferredTask();
    void lock.run(task);
    expect(lock.isLocked).toBe(true);
  });

  it("ignores a second run while the first is still going (double tap)", async () => {
    const lock = createSubmitLock();
    const first = deferredTask();
    const second = deferredTask();
    const running = lock.run(first.task);
    await lock.run(second.task);
    expect(first.calls()).toBe(1);
    expect(second.calls()).toBe(0);
    first.finish();
    await running;
  });

  it("unlocks when the task finishes without keepLocked (an error result)", async () => {
    const lock = createSubmitLock();
    await lock.run(async () => {});
    expect(lock.isLocked).toBe(false);
  });

  it("unlocks when the task throws, and the throw still reaches the caller", async () => {
    const lock = createSubmitLock();
    const { task, fail } = deferredTask();
    const running = lock.run(task);
    fail(new Error("network"));
    await expect(running).rejects.toThrow("network");
    expect(lock.isLocked).toBe(false);
  });

  it("hands a thrown task to onError instead of rejecting (no unhandled rejection)", async () => {
    const lock = createSubmitLock();
    const errors: unknown[] = [];
    const thrown = new Error("network");
    await expect(
      lock.run(async () => {
        throw thrown;
      }, (error) => errors.push(error)),
    ).resolves.toBeUndefined();
    expect(errors).toEqual([thrown]);
  });

  it("is already unlocked when onError runs (the error shows on an idle button)", async () => {
    const lock = createSubmitLock();
    let lockedDuringOnError: boolean | null = null;
    await lock.run(async () => {
      throw new Error("network");
    }, () => {
      lockedDuringOnError = lock.isLocked;
    });
    expect(lockedDuringOnError).toBe(false);
  });

  it("never calls onError when the task succeeds", async () => {
    const lock = createSubmitLock();
    let called = false;
    await lock.run(async () => {}, () => {
      called = true;
    });
    expect(called).toBe(false);
  });

  it("stays locked after keepLocked (success, the page is leaving)", async () => {
    const lock = createSubmitLock();
    await lock.run(async () => lock.keepLocked());
    expect(lock.isLocked).toBe(true);
    expect(lock.isKept).toBe(true);
  });

  it("ignores every run while kept locked (a tap during the success toast)", async () => {
    const lock = createSubmitLock();
    await lock.run(async () => lock.keepLocked());
    const later = deferredTask();
    await lock.run(later.task);
    expect(later.calls()).toBe(0);
  });

  it("runs again after unlock (an error, then fix, then resubmit)", async () => {
    const lock = createSubmitLock();
    await lock.run(async () => lock.keepLocked());
    lock.unlock();
    let ran = false;
    await lock.run(async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it("does nothing on keepLocked when not running", () => {
    const lock = createSubmitLock();
    lock.keepLocked();
    expect(lock.isLocked).toBe(false);
  });

  it("reports each change: locked, kept, then unlocked", async () => {
    const changes: string[] = [];
    const lock = createSubmitLock(({ isLocked, isKept }) =>
      changes.push(`${isLocked}/${isKept}`),
    );
    await lock.run(async () => lock.keepLocked());
    lock.unlock();
    expect(changes).toEqual(["true/false", "true/true", "false/false"]);
  });
});
