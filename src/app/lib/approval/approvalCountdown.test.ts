import { describe, it, expect } from "vitest";
import {
  announcementFor,
  isJustSent,
  progressFraction,
  remainingLabel,
  remainingSeconds,
  waitingAnnouncement,
  waitingCopy,
} from "./approvalCountdown";

describe("remainingLabel", () => {
  it.each([
    [541, { key: "minutesLeft", values: { minutes: 10 } }],
    [540, { key: "minutesLeft", values: { minutes: 9 } }],
    [60, { key: "minutesLeft", values: { minutes: 1 } }],
    [59, { key: "secondsLeft", values: { seconds: 59 } }],
    [0, { key: "checking" }],
  ])("writes %s seconds as %j", (seconds, label) => {
    expect(remainingLabel(seconds)).toEqual(label);
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

describe("progressFraction", () => {
  it("stays within 0..1", () => {
    expect(progressFraction(900, 600)).toBe(1);
    expect(progressFraction(0, 600)).toBe(0);
    expect(progressFraction(300, 600)).toBe(0.5);
  });
});

describe("announcementFor", () => {
  it.each([
    [301, 300, 5],
    [121, 120, 2],
    [61, 60, 1],
  ])("announces once when %s → %s", (previous, current, minutes) => {
    expect(announcementFor(previous, current)).toBe(minutes);
  });

  it("announces the lowest mark when a re-sync jumps past several", () => {
    expect(announcementFor(400, 30)).toBe(1);
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

describe("isJustSent", () => {
  it("is just sent for under a minute", () => {
    expect(isJustSent(0)).toBe(true);
    expect(isJustSent(59)).toBe(true);
  });

  it("isn't from a minute on", () => {
    expect(isJustSent(60)).toBe(false);
  });
});

describe("waitingCopy", () => {
  it("keeps the Counter copy: auto-cancel line and the counter hint", () => {
    expect(waitingCopy(true)).toEqual({
      title: "counterTitle",
      short: "counterShort",
      deadline: "counterDeadline",
      hint: "counterHint",
      overdue: null,
    });
  });

  it("gives a Table round a soft target, no hint, and a calm overdue line", () => {
    expect(waitingCopy(false)).toEqual({
      title: "tableTitle",
      short: "tableShort",
      deadline: "tableDeadline",
      hint: null,
      overdue: "tableOverdue",
    });
  });
});

describe("waitingAnnouncement", () => {
  it("announces the minute marks for both kinds of round", () => {
    const twoMinutes = { key: "minutesLeftToConfirm", values: { minutes: 2 } };
    expect(waitingAnnouncement(121, 120, true)).toEqual(twoMinutes);
    expect(waitingAnnouncement(121, 120, false)).toEqual(twoMinutes);
  });

  it("announces a Table round's 'taking longer' once, as it reaches 0", () => {
    expect(waitingAnnouncement(1, 0, false)).toEqual({ key: "tableOverdue" });
    expect(waitingAnnouncement(0, 0, false)).toBeNull();
  });

  it("says nothing extra for a Counter round reaching 0", () => {
    expect(waitingAnnouncement(1, 0, true)).toBeNull();
  });

  it("stays quiet on the first reading, even when already overdue", () => {
    expect(waitingAnnouncement(null, 0, false)).toBeNull();
  });
});
