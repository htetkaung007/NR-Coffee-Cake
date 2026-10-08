import { describe, it, expect } from "vitest";
import { planMenuLocations, NO_LOCATION_MESSAGE } from "./menuLocations";

describe("planMenuLocations", () => {
  it("creates a stock row at every shown location for a new menu, and hides the rest", () => {
    expect(
      planMenuLocations({
        activeLocationIds: [1, 2, 3],
        shownLocationIds: [1, 2],
        hiddenLocationIds: [],
        stockLocationIds: [],
      }),
    ).toEqual({ unhide: [], hide: [3], createStock: [1, 2] });
  });

  it("re-shows a hidden location without creating a second stock row", () => {
    expect(
      planMenuLocations({
        activeLocationIds: [1, 2],
        shownLocationIds: [1, 2],
        hiddenLocationIds: [2],
        stockLocationIds: [1, 2],
      }),
    ).toEqual({ unhide: [2], hide: [], createStock: [] });
  });

  it("hides a shown location and keeps its stock row", () => {
    expect(
      planMenuLocations({
        activeLocationIds: [1, 2],
        shownLocationIds: [1],
        hiddenLocationIds: [],
        stockLocationIds: [1, 2],
      }),
    ).toEqual({ unhide: [], hide: [2], createStock: [] });
  });

  it("does nothing when the menu already shows exactly there", () => {
    expect(
      planMenuLocations({
        activeLocationIds: [1, 2],
        shownLocationIds: [1],
        hiddenLocationIds: [2],
        stockLocationIds: [1],
      }),
    ).toEqual({ unhide: [], hide: [], createStock: [] });
  });

  it("never adds a second hide row where one is already active", () => {
    const plan = planMenuLocations({
      activeLocationIds: [1, 2],
      shownLocationIds: [1],
      hiddenLocationIds: [2],
      stockLocationIds: [1],
    });
    expect(plan.hide).not.toContain(2);
  });

  it("refuses a location that isn't one of the company's active ones", () => {
    expect(() =>
      planMenuLocations({
        activeLocationIds: [1, 2],
        shownLocationIds: [1, 99],
        hiddenLocationIds: [],
        stockLocationIds: [],
      }),
    ).toThrow("Choose locations from your own company.");
  });

  it("refuses showing the menu nowhere", () => {
    expect(() =>
      planMenuLocations({
        activeLocationIds: [1],
        shownLocationIds: [],
        hiddenLocationIds: [],
        stockLocationIds: [],
      }),
    ).toThrow(NO_LOCATION_MESSAGE);
  });

  it("counts a location ticked twice once", () => {
    expect(
      planMenuLocations({
        activeLocationIds: [1, 2],
        shownLocationIds: [1, 1],
        hiddenLocationIds: [],
        stockLocationIds: [],
      }),
    ).toEqual({ unhide: [], hide: [2], createStock: [1] });
  });
});
