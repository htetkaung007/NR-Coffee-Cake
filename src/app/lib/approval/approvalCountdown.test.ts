import { describe, it, expect } from "vitest";
import {
  announcementFor,
  progressFraction,
  remainingLabel,
  remainingSeconds,
  waitingAnnouncement,
  waitingCopy,
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

describe("waitingCopy", () => {
  it("keeps the Counter copy: auto-cancel line and the counter hint", () => {
    const copy = waitingCopy(true);
    expect(copy.title).toBe("Waiting for the counter to confirm");
    expect(copy.deadlineLine("10:12")).toBe(
      "If it isn't confirmed by 10:12, it will be cancelled automatically — you won't be charged.",
    );
    expect(copy.hint?.("#A013")).toBe("Still waiting? Show order #A013 at the counter.");
    expect(copy.overdue).toBeNull();
  });

  it("gives a Table round a soft target, no hint, and a calm overdue line", () => {
    const copy = waitingCopy(false);
    expect(copy.title).toBe("Waiting for our staff to confirm");
    expect(copy.subtitle).toBe("Usually confirmed within a few minutes.");
    expect(copy.deadlineLine("10:12")).toBe("Usually confirmed by 10:12.");
    expect(copy.hint).toBeNull();
    expect(copy.overdue).toBe(
      "Taking a little longer than usual — please let our staff know.",
    );
  });
});

describe("waitingAnnouncement", () => {
  it("announces the minute marks for both kinds of round", () => {
    expect(waitingAnnouncement(121, 120, true)).toBe("2 minutes left to confirm");
    expect(waitingAnnouncement(121, 120, false)).toBe("2 minutes left to confirm");
  });

  it("announces a Table round's 'taking longer' once, as it reaches 0", () => {
    expect(waitingAnnouncement(1, 0, false)).toBe(
      "Taking a little longer than usual — please let our staff know.",
    );
    expect(waitingAnnouncement(0, 0, false)).toBeNull();
  });

  it("says nothing extra for a Counter round reaching 0", () => {
    expect(waitingAnnouncement(1, 0, true)).toBeNull();
  });

  it("stays quiet on the first reading, even when already overdue", () => {
    expect(waitingAnnouncement(null, 0, false)).toBeNull();
  });
});
