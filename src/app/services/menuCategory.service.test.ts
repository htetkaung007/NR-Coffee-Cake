import { describe, it, expect, vi } from "vitest";

// mergeIntoCompanyOrder itself is pure, but its module imports the Prisma
// client, which is built (and needs a database URL) on import. Stub that
// import so these tests never create a client.
vi.mock("@/app/utils/prisma", () => ({ prisma: {} }));

import { mergeIntoCompanyOrder } from "./menuCategory.service";

describe("mergeIntoCompanyOrder", () => {
  // Company order 1..5; categories 2 and 4 are hidden at this location,
  // and the location's visible ones (1, 3, 5) are reordered to 5, 3, 1.
  const companyOrder = [1, 2, 3, 4, 5];
  const newVisibleOrder = [5, 3, 1];

  it("keeps every category hidden at the location in its slot", () => {
    const merged = mergeIntoCompanyOrder(companyOrder, newVisibleOrder);
    expect(merged[1]).toBe(2);
    expect(merged[3]).toBe(4);
  });

  it("fills the remaining slots with the visible categories in their new order", () => {
    const merged = mergeIntoCompanyOrder(companyOrder, newVisibleOrder);
    expect(merged.filter((id) => newVisibleOrder.includes(id))).toEqual([
      5, 3, 1,
    ]);
  });

  it("contains every category exactly once", () => {
    const merged = mergeIntoCompanyOrder(companyOrder, newVisibleOrder);
    expect(merged).toHaveLength(companyOrder.length);
    expect([...merged].sort((a, b) => a - b)).toEqual(companyOrder);
  });

  it("becomes the new order itself when nothing is hidden", () => {
    expect(mergeIntoCompanyOrder([1, 2, 3], [3, 1, 2])).toEqual([3, 1, 2]);
  });
});
