import { describe, it, expect } from "vitest";
import {
  TAP_SLOP_PX,
  activeSlideFromScroll,
  carouselMode,
  isTap,
  stepSlide,
} from "./carousel";

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

describe("isTap", () => {
  const still = { movedX: 0, movedY: 0, scrolledBy: 0 };

  it("is a tap when the finger didn't move and the row didn't scroll", () => {
    expect(isTap(still)).toBe(true);
  });

  it("is still a tap with a small jitter under the limit", () => {
    expect(isTap({ movedX: 6, movedY: -5, scrolledBy: 4 })).toBe(true);
  });

  it("is not a tap after a sideways swipe (the photos move instead)", () => {
    expect(isTap({ ...still, movedX: -60 })).toBe(false);
  });

  it("is not a tap after a vertical drag (the sheet closing)", () => {
    expect(isTap({ ...still, movedY: 80 })).toBe(false);
  });

  it("is not a tap when the row scrolled in between (a snap settling)", () => {
    expect(isTap({ ...still, scrolledBy: -40 })).toBe(false);
  });

  it("allows up to the limit, not past it", () => {
    expect(isTap({ ...still, movedX: TAP_SLOP_PX - 1 })).toBe(true);
    expect(isTap({ ...still, movedX: TAP_SLOP_PX })).toBe(false);
  });
});
