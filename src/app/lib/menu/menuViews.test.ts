import { describe, expect, it } from "vitest";
import { oldestKeptViewDay, VIEW_SEEN_KEEP_DAYS, viewerKeyFor } from "./menuViews";

describe("viewerKeyFor", () => {
  it("is a sha256 hex, never the raw token", () => {
    const key = viewerKeyFor({ kind: "table", contributorToken: "secret-token" });
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("secret-token");
  });

  it("gives the same key for the same customer (one view per day)", () => {
    expect(viewerKeyFor({ kind: "bill", billRootId: 42 })).toBe(
      viewerKeyFor({ kind: "bill", billRootId: 42 }),
    );
  });

  it("gives a new key for a new bill (paid, then a new scan)", () => {
    expect(viewerKeyFor({ kind: "bill", billRootId: 42 })).not.toBe(
      viewerKeyFor({ kind: "bill", billRootId: 43 }),
    );
  });

  it("never mixes a table token up with a bill id that reads the same", () => {
    expect(viewerKeyFor({ kind: "table", contributorToken: "42" })).not.toBe(
      viewerKeyFor({ kind: "bill", billRootId: 42 }),
    );
  });
});

describe("oldestKeptViewDay", () => {
  it("keeps 90 shop days", () => {
    expect(VIEW_SEEN_KEEP_DAYS).toBe(90);
    expect(oldestKeptViewDay("2026-10-22")).toBe("2026-07-24");
  });
});
