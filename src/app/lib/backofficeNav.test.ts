import { describe, it, expect } from "vitest";
import { findActiveHref, visibleNavSections } from "./backofficeNav";

const hrefs = [
  "/backoffice/order",
  "/backoffice/order/new",
  "/backoffice/tables",
];

describe("findActiveHref", () => {
  it("picks the item whose href equals the path", () => {
    expect(findActiveHref("/backoffice/order", hrefs)).toBe("/backoffice/order");
  });

  it("picks only the most specific item when several prefixes match", () => {
    expect(findActiveHref("/backoffice/order/new", hrefs)).toBe(
      "/backoffice/order/new",
    );
  });

  it("keeps the parent item active for its sub-pages without their own item", () => {
    expect(findActiveHref("/backoffice/order/history", hrefs)).toBe(
      "/backoffice/order",
    );
    expect(findActiveHref("/backoffice/order/t-12-abc", hrefs)).toBe(
      "/backoffice/order",
    );
  });

  it("matches whole path segments only, not partial words", () => {
    expect(findActiveHref("/backoffice/orders", hrefs)).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(findActiveHref("/backoffice", hrefs)).toBeNull();
    expect(findActiveHref(null, hrefs)).toBeNull();
  });
});

describe("visibleNavSections", () => {
  const sections = [
    {
      title: "Service",
      items: [{ href: "/a" }, { href: "/b", roles: ["ADMIN" as const] }],
    },
    {
      title: "Business",
      items: [{ href: "/c", roles: ["ADMIN" as const] }],
    },
  ];

  it("shows items without a roles list to everyone", () => {
    const result = visibleNavSections(sections, "MANAGER");
    expect(result[0].items.map((item) => item.href)).toEqual(["/a"]);
  });

  it("shows role-restricted items to roles on their list", () => {
    const result = visibleNavSections(sections, "ADMIN");
    expect(result.flatMap((section) => section.items).length).toBe(3);
  });

  it("drops a section that has no visible items for the role", () => {
    const result = visibleNavSections(sections, "MANAGER");
    expect(result.map((section) => section.title)).toEqual(["Service"]);
  });
});
