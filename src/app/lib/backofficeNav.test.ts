import { describe, it, expect } from "vitest";
import { findActiveHref, visibleNavSections } from "./backofficeNav";
import { canAccess, type AccessRule } from "./permissions";

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
      items: [
        { href: "/a", access: "staff" as const },
        { href: "/b", access: "TABLES_MANAGE" as const },
      ],
    },
    {
      title: "Business",
      items: [{ href: "/c", access: "owner" as const }],
    },
  ];
  // A manager granted nothing but the always-allowed work.
  const manager = (rule: AccessRule) => canAccess("MANAGER", [], rule);
  const owner = (rule: AccessRule) => canAccess("ADMIN", [], rule);

  it("shows staff items to every manager", () => {
    const result = visibleNavSections(sections, manager);
    expect(result[0].items.map((item) => item.href)).toEqual(["/a"]);
  });

  it("shows a permission item to a manager granted it", () => {
    const result = visibleNavSections(sections, (rule) =>
      canAccess("MANAGER", ["TABLES_MANAGE"], rule),
    );
    expect(result[0].items.map((item) => item.href)).toEqual(["/a", "/b"]);
  });

  it("shows everything to the owner", () => {
    const result = visibleNavSections(sections, owner);
    expect(result.flatMap((section) => section.items).length).toBe(3);
  });

  it("drops a section that has no visible items", () => {
    const result = visibleNavSections(sections, manager);
    expect(result.map((section) => section.title)).toEqual(["Service"]);
  });
});
