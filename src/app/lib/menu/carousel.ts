/**
 * The menu detail's photos (components/orderUI/menuDetail/MenuPhotos):
 * which presentation, and which slide is showing. Pure.
 */

export type CarouselMode = "none" | "single" | "carousel";

/** 0 photos → the letter tile; 1 → just the photo; 2–3 → swipe
 *  carousel with dots. */
export function carouselMode(count: number): CarouselMode {
  if (count <= 0) return "none";
  return count === 1 ? "single" : "carousel";
}

/** The slide showing in a scroll-snap row of `count` full-width slides,
 *  from the row's scrollLeft: the nearest slide start, kept within
 *  0..count-1 (a bounce past either end); 0 before the box has a width. */
export function activeSlideFromScroll(
  scrollLeft: number,
  slideWidth: number,
  count: number,
): number {
  if (slideWidth <= 0 || count <= 0) return 0;
  const nearest = Math.round(scrollLeft / slideWidth);
  return Math.min(Math.max(nearest, 0), count - 1);
}

/** One slide back (-1) or on (1), stopping at the ends (no wrap). */
export function stepSlide(current: number, direction: -1 | 1, count: number): number {
  return Math.min(Math.max(current + direction, 0), Math.max(count - 1, 0));
}
