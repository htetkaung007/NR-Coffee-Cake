import { describe, it, expect } from "vitest";
import {
  ALERT_REPEAT_CHOICES,
  ALERT_REPEAT_SECONDS,
} from "./orderAlertSoundRules";
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
    alertedIds: [],
    lastAlertAt: null,
    now: NOW,
    soundEnabled: true,
    repeat: ALERT_REPEAT_SECONDS,
    ...overrides,
  });
}

/** Round 1 has already rung once, `msAgo` ago. */
const rang = (msAgo: number) => ({ alertedIds: [1], lastAlertAt: NOW - msAgo });

describe("ALERT_REPEAT_SECONDS", () => {
  it("repeats every 5 seconds by default", () => {
    expect(ALERT_REPEAT_SECONDS).toBe(5);
  });
});

describe("shouldPlayAlert", () => {
  it("rings at once for a round nobody has acknowledged", () => {
    expect(check({ lastAlertAt: null })).toBe(true);
  });

  it("does not repeat before the interval has passed", () => {
    expect(check(rang(INTERVAL_MS - 1))).toBe(false);
  });

  it("repeats once the interval has passed", () => {
    expect(check(rang(INTERVAL_MS))).toBe(true);
  });

  it("repeats on time for every interval choice", () => {
    for (const seconds of [3, 5, 10, 30] as const) {
      expect(check({ repeat: seconds, ...rang(seconds * 1000 - 1) })).toBe(
        false,
      );
      expect(check({ repeat: seconds, ...rang(seconds * 1000) })).toBe(true);
    }
  });

  it("never repeats with Once", () => {
    expect(check({ repeat: "once", ...rang(INTERVAL_MS * 100) })).toBe(false);
  });

  it("rings once with Once for a round that hasn't rung yet", () => {
    expect(check({ repeat: "once" })).toBe(true);
  });

  it("rings at once for a newly arrived round in every mode, not waiting for the interval", () => {
    for (const repeat of ALERT_REPEAT_CHOICES) {
      expect(
        check({
          repeat,
          waitingIds: [1, 2],
          alertedIds: [1],
          lastAlertAt: NOW - 1,
        }),
      ).toBe(true);
    }
  });

  it("stops when nothing is waiting for approval any more", () => {
    expect(check({ waitingIds: [], ...rang(INTERVAL_MS) })).toBe(false);
  });

  it("stops once every waiting round is acknowledged", () => {
    expect(
      check({
        waitingIds: [1, 2],
        acknowledgedIds: [1, 2],
        ...rang(INTERVAL_MS),
      }),
    ).toBe(false);
  });

  it("never rings with the sound off", () => {
    expect(check({ soundEnabled: false })).toBe(false);
    expect(check({ soundEnabled: false, ...rang(INTERVAL_MS) })).toBe(false);
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
