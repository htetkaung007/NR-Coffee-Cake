import { describe, expect, it } from "vitest";
import { MIN_VIEWERS_FOR_RATE, viewFunnel } from "./viewFunnel";

describe("viewFunnel", () => {
  it("shows a rate only from 10 viewers", () => {
    expect(MIN_VIEWERS_FOR_RATE).toBe(10);
  });

  it("counts the viewers who didn't order", () => {
    expect(viewFunnel({ viewers: 40, orderers: 12 }).viewedNotOrdered).toBe(28);
  });

  it("never goes below 0 when more ordered than viewed (ordered without opening the detail)", () => {
    expect(viewFunnel({ viewers: 3, orderers: 5 }).viewedNotOrdered).toBe(0);
  });

  it("gives the rate as orderers out of viewers, in percent", () => {
    expect(viewFunnel({ viewers: 40, orderers: 12 }).rate).toBe(30);
  });

  it("rounds the rate to one decimal", () => {
    expect(viewFunnel({ viewers: 30, orderers: 10 }).rate).toBe(33.3);
  });

  it("has no rate below 10 viewers (too few to mean anything)", () => {
    expect(viewFunnel({ viewers: 9, orderers: 3 }).rate).toBeNull();
  });

  it("has a rate at exactly 10 viewers", () => {
    expect(viewFunnel({ viewers: 10, orderers: 3 }).rate).toBe(30);
  });

  it("caps the rate at 100% when more ordered than viewed", () => {
    expect(viewFunnel({ viewers: 10, orderers: 14 }).rate).toBe(100);
  });

  it("says nothing at all when the period has no view data (null, never 0)", () => {
    expect(viewFunnel({ viewers: null, orderers: 7 })).toEqual({
      viewers: null,
      orderers: null,
      viewedNotOrdered: null,
      rate: null,
    });
  });

  it("keeps the viewers and orderers it was given", () => {
    const funnel = viewFunnel({ viewers: 12, orderers: 4 });
    expect([funnel.viewers, funnel.orderers]).toEqual([12, 4]);
  });
});
