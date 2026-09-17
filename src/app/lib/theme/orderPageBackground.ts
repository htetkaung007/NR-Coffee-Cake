/** Shared by TableOrderClient and CounterOrderClient (page background)
 *  and MenuBrowser (sticky search/category bar, via its backgroundImage
 *  prop) — both flows use the exact same look now, and both rely on
 *  backgroundAttachment: "fixed" so the sticky bar lines up pixel-for-
 *  pixel with the page behind it instead of reading as a flat color
 *  patch. One definition here keeps the two flows and the sticky bar
 *  from drifting out of sync. */
export const ORDER_PAGE_BACKGROUND_COLOR = "var(--color-brand-cream)";
export const ORDER_PAGE_BACKGROUND_IMAGE = `
  radial-gradient(circle at 8% 15%, var(--color-brand-accent) 0%, transparent 30%),
  radial-gradient(circle at 92% 10%, var(--color-brand-caramel) 0%, transparent 35%),
  radial-gradient(circle at 15% 90%, var(--color-brand-caramel) 0%, transparent 30%),
  radial-gradient(circle at 90% 85%, var(--color-brand-accent) 0%, transparent 30%)
`;
