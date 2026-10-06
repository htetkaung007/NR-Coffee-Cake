import { describe, it, expect } from "vitest";
import {
  announcementFor,
  progressFraction,
  remainingLabel,
  remainingSeconds,
  secondsUntil,
} from "./approvalCountdown";

describe("remainingLabel", () => {
  it.each([
    [541, "10 min left"],
    [540, "9 min left"],
    [60, "1 min left"],
    [59, "59 sec left"],
    [0, "Checking with the counter…"],
  ])("writes %s seconds as %j", (seconds, label) => {
    expect(remainingLabel(seconds)).toBe(label);
  });
});

describe("remainingSeconds", () => {
  it("counts down from the server's figure by the time elapsed", () => {
    expect(remainingSeconds(600, 30_000)).toBe(570);
  });

  it("reads 1 until a full second has really gone", () => {
    expect(remainingSeconds(1, 999)).toBe(1);
    expect(remainingSeconds(1, 1000)).toBe(0);
  });

  it("never goes below 0", () => {
    expect(remainingSeconds(5, 60_000)).toBe(0);
  });
});

describe("secondsUntil", () => {
  it("never goes below 0 once the deadline has passed", () => {
    expect(
      secondsUntil(new Date("2026-10-05T10:00:00Z"), new Date("2026-10-05T10:00:05Z")),
    ).toBe(0);
  });
});

describe("progressFraction", () => {
  it("stays within 0..1", () => {
    expect(progressFraction(900, 600)).toBe(1);
    expect(progressFraction(0, 600)).toBe(0);
    expect(progressFraction(300, 600)).toBe(0.5);
  });
});

describe("announcementFor", () => {
  it.each([
    [301, 300, "5 minutes left to confirm"],
    [121, 120, "2 minutes left to confirm"],
    [61, 60, "1 minute left to confirm"],
  ])("announces once when %s → %s", (previous, current, message) => {
    expect(announcementFor(previous, current)).toBe(message);
  });

  it.each([
    [300, 299],
    [120, 119],
    [60, 59],
  ])("stays quiet on the next tick (%s → %s)", (previous, current) => {
    expect(announcementFor(previous, current)).toBeNull();
  });

  it("stays quiet on ordinary ticks and on the first reading", () => {
    expect(announcementFor(450, 449)).toBeNull();
    expect(announcementFor(null, 300)).toBeNull();
  });
});
