import { describe, it, expect } from "vitest";
import { orderPlaceTitle } from "./orderPlace";

const table = (tableName: string) => orderPlaceTitle({ kind: "table", tableName, othersCount: 0 });

describe("orderPlaceTitle — a table", () => {
  it("keeps a name that already starts with Table, as it is", () => {
    expect(table("Table 5")).toEqual({ text: "Table 5" });
  });

  it("recognises Table in any case", () => {
    expect(table("table 5")).toEqual({ text: "table 5" });
    expect(table("TABLE 12")).toEqual({ text: "TABLE 12" });
  });

  it("puts the table word in front of a bare number", () => {
    expect(table("5")).toEqual({ key: "table", values: { name: "5" } });
  });

  it("puts the table word in front of a short code", () => {
    expect(table("T1")).toEqual({ key: "table", values: { name: "T1" } });
  });

  it("trims spaces around the name", () => {
    expect(table("  Table 5  ")).toEqual({ text: "Table 5" });
    expect(table(" 7 ")).toEqual({ key: "table", values: { name: "7" } });
  });

  it("says Your table when there's no name", () => {
    expect(table("")).toEqual({ key: "yourTable" });
    expect(table("   ")).toEqual({ key: "yourTable" });
  });
});

describe("orderPlaceTitle — the counter and online", () => {
  it("titles the counter with its order number, without the #", () => {
    expect(orderPlaceTitle({ kind: "counter", orderNumber: "#A012", awaitingApproval: false })).toEqual({
      key: "counterOrder",
      values: { number: "A012" },
    });
  });

  it("reads a number without its # the same, so it never gets two", () => {
    expect(orderPlaceTitle({ kind: "counter", orderNumber: "A012", awaitingApproval: false })).toEqual({
      key: "counterOrder",
      values: { number: "A012" },
    });
  });

  it("is just the counter before there's an order number", () => {
    expect(orderPlaceTitle({ kind: "counter", orderNumber: null, awaitingApproval: false })).toEqual({
      key: "counter",
    });
    expect(orderPlaceTitle({ kind: "counter", orderNumber: "", awaitingApproval: false })).toEqual({
      key: "counter",
    });
  });

  it("titles browsing without a QR session as the Online menu", () => {
    expect(orderPlaceTitle({ kind: "online" })).toEqual({ key: "online" });
  });
});
