import { describe, it, expect } from "vitest";
import { activeSlideFromScroll, carouselMode, stepSlide } from "./carousel";

describe("carouselMode", () => {
  it("shows the placeholder for no photo", () => {
    expect(carouselMode(0)).toBe("none");
  });

  it("shows just the photo for one", () => {
    expect(carouselMode(1)).toBe("single");
  });

  it("is a swipe carousel for two or three", () => {
    expect(carouselMode(2)).toBe("carousel");
    expect(carouselMode(3)).toBe("carousel");
  });
});

describe("activeSlideFromScroll", () => {
  it("is the slide whose start is nearest the scroll position", () => {
    expect(activeSlideFromScroll(0, 300, 3)).toBe(0);
    expect(activeSlideFromScroll(310, 300, 3)).toBe(1);
    expect(activeSlideFromScroll(449, 300, 3)).toBe(1);
    expect(activeSlideFromScroll(451, 300, 3)).toBe(2);
  });

  it("stays within the slides (overscroll, a bounce past either end)", () => {
    expect(activeSlideFromScroll(-40, 300, 3)).toBe(0);
    expect(activeSlideFromScroll(2000, 300, 3)).toBe(2);
  });

  it("is the first slide before the box has a width", () => {
    expect(activeSlideFromScroll(120, 0, 3)).toBe(0);
  });
});

describe("stepSlide", () => {
  it("moves one slide either way", () => {
    expect(stepSlide(0, 1, 3)).toBe(1);
    expect(stepSlide(2, -1, 3)).toBe(1);
  });

  it("stops at the first and the last slide (no wrap-around)", () => {
    expect(stepSlide(0, -1, 3)).toBe(0);
    expect(stepSlide(2, 1, 3)).toBe(2);
  });
});
