import { describe, it, expect } from "vitest";
import {
  BOTTOM_BAR_CLEARANCE,
  RAIL_CLEARANCE,
  RAIL_ITEM_MIN_HEIGHT_PX,
  RAIL_ITEM_WIDTH_PX,
  RAIL_OFFSET_PX,
  RAIL_WIDTH_PX,
  barClearanceSx,
  railClearanceSx,
} from "./bottomBarLayout";
import { touchTabletLandscapeMedia } from "@/app/lib/theme/sharedThemeTokens";
import myMessages from "../../../../messages/my.json";

describe("barClearanceSx — the frame's bottom room", () => {
  it("keeps today's bottom-bar clearance everywhere but a landscape touch screen", () => {
    expect(barClearanceSx.pb).toBe(BOTTOM_BAR_CLEARANCE);
  });

  it("drops to the page's normal bottom edge (16px + safe area) under the rail", () => {
    expect(barClearanceSx[touchTabletLandscapeMedia]).toEqual({
      pb: "calc(16px + env(safe-area-inset-bottom, 0px))",
    });
  });

  it("changes nothing but those two (phones, portrait tablets and laptops keep their layout)", () => {
    expect(Object.keys(barClearanceSx).sort()).toEqual(
      ["pb", touchTabletLandscapeMedia].sort(),
    );
  });
});

describe("railClearanceSx — the content's right room", () => {
  it("only applies on a landscape touch screen", () => {
    expect(Object.keys(railClearanceSx)).toEqual([touchTabletLandscapeMedia]);
  });

  it("keeps the rail's width, offset, gap and the right safe area free", () => {
    expect(railClearanceSx[touchTabletLandscapeMedia]).toEqual({ pr: RAIL_CLEARANCE });
    expect(RAIL_CLEARANCE).toBe(
      `calc(${RAIL_WIDTH_PX + RAIL_OFFSET_PX + 8}px + env(safe-area-inset-right, 0px))`,
    );
  });
});

describe("the rail's size", () => {
  it("has items at least 56px wide (each Myanmar syllable fits; longer words wrap at U+200B)", () => {
    expect(RAIL_ITEM_WIDTH_PX).toBeGreaterThanOrEqual(56);
  });

  it("has items comfortably taller than the 44px touch minimum", () => {
    expect(RAIL_ITEM_MIN_HEIGHT_PX).toBeGreaterThanOrEqual(64);
  });

  it("is its items plus the list padding and the border", () => {
    expect(RAIL_WIDTH_PX).toBe(RAIL_ITEM_WIDTH_PX + 2 * 4 + 2 * 1);
  });
});

describe("the rail's Myanmar captions", () => {
  it("lets ခြင်းတောင်း wrap between its syllables (a zero-width space), never inside one", () => {
    expect(myMessages.nav.cart).toBe("ခြင်း\u200bတောင်း");
  });
});
