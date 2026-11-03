import { describe, it, expect } from "vitest";
import { ALERT_REPEAT_SECONDS } from "./orderAlertSoundRules";
import {
  acknowledge,
  parseAcknowledged,
  pruneAcknowledged,
  ringingIds,
  serializeAcknowledged,
  shouldPlayAlert,
} from "./orderAlertRepeat";

const NOW = 1_000_000;
const INTERVAL_MS = ALERT_REPEAT_SECONDS * 1000;

function check(overrides: Partial<Parameters<typeof shouldPlayAlert>[0]>) {
  return shouldPlayAlert({
    waitingIds: [1],
    acknowledgedIds: [],
    lastAlertAt: null,
    now: NOW,
    soundEnabled: true,
    ...overrides,
  });
}

describe("ALERT_REPEAT_SECONDS", () => {
  it("repeats every 5 seconds", () => {
    expect(ALERT_REPEAT_SECONDS).toBe(5);
  });
});

describe("shouldPlayAlert", () => {
  it("rings at once for a round nobody has acknowledged", () => {
    expect(check({ lastAlertAt: null })).toBe(true);
  });

  it("does not repeat before the interval has passed", () => {
    expect(check({ lastAlertAt: NOW - INTERVAL_MS + 1 })).toBe(false);
  });

  it("repeats once the interval has passed", () => {
    expect(check({ lastAlertAt: NOW - INTERVAL_MS })).toBe(true);
  });

  it("stops when nothing is waiting for approval any more", () => {
    expect(check({ waitingIds: [], lastAlertAt: NOW - INTERVAL_MS })).toBe(
      false,
    );
  });

  it("stops once every waiting round is acknowledged", () => {
    expect(
      check({
        waitingIds: [1, 2],
        acknowledgedIds: [1, 2],
        lastAlertAt: NOW - INTERVAL_MS,
      }),
    ).toBe(false);
  });

  it("never rings with the sound off", () => {
    expect(check({ soundEnabled: false })).toBe(false);
    expect(check({ soundEnabled: false, lastAlertAt: NOW - INTERVAL_MS })).toBe(
      false,
    );
  });
});

describe("acknowledge", () => {
  it("covers every round waiting now, not only the one opened", () => {
    const acknowledged = acknowledge([3, 4, 5], []);
    expect(ringingIds([3, 4, 5], acknowledged)).toEqual([]);
  });

  it("keeps the rounds acknowledged before", () => {
    expect(acknowledge([2], [1]).sort()).toEqual([1, 2]);
  });

  it("lets a round that arrives afterwards ring again", () => {
    const acknowledged = acknowledge([3, 4], []);
    expect(ringingIds([3, 4, 9], acknowledged)).toEqual([9]);
    expect(
      check({ waitingIds: [3, 4, 9], acknowledgedIds: acknowledged }),
    ).toBe(true);
  });
});

describe("pruneAcknowledged", () => {
  it("keeps only the rounds still waiting for approval", () => {
    expect(pruneAcknowledged([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
  });

  it("empties the list when nothing waits", () => {
    expect(pruneAcknowledged([1, 2], [])).toEqual([]);
  });
});

describe("parseAcknowledged", () => {
  it("reads back what serializeAcknowledged stored", () => {
    expect(parseAcknowledged(serializeAcknowledged([4, 7]))).toEqual([4, 7]);
  });

  it("is an empty list when nothing is stored", () => {
    expect(parseAcknowledged(null)).toEqual([]);
  });

  it("is an empty list for a broken stored value", () => {
    expect(parseAcknowledged("{not json")).toEqual([]);
    expect(parseAcknowledged('{"a":1}')).toEqual([]);
    expect(parseAcknowledged('"7"')).toEqual([]);
  });

  it("drops entries that aren't round ids", () => {
    expect(parseAcknowledged('[1, "x", 2.5, -3, null, 8]')).toEqual([1, 8]);
  });
});
