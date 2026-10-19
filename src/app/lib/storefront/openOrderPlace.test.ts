import { describe, it, expect } from "vitest";
import {
  openOrderPlace,
  openPlaceMenuQuery,
  parseOpenPlaceNotice,
} from "./openOrderPlace";

describe("openOrderPlace", () => {
  it("sends a Counter scan back to the table this browser has an order at here", () => {
    expect(
      openOrderPlace({ scan: "counter", openTableIdHere: 5, hasOpenCounterBillHere: false }),
    ).toEqual({ kind: "toTable", tableId: 5 });
  });

  it("lets a Counter scan through with no current table token here (none, stale after payment, or another location)", () => {
    expect(
      openOrderPlace({ scan: "counter", openTableIdHere: null, hasOpenCounterBillHere: false }),
    ).toEqual({ kind: "proceed" });
  });

  it("lets a Counter scan resume this browser's own open counter bill", () => {
    expect(
      openOrderPlace({ scan: "counter", openTableIdHere: null, hasOpenCounterBillHere: true }),
    ).toEqual({ kind: "proceed" });
  });

  it("sends a Table scan back to the counter when this browser has an open counter bill here", () => {
    expect(
      openOrderPlace({ scan: "table", openTableIdHere: null, hasOpenCounterBillHere: true }),
    ).toEqual({ kind: "toCounter" });
  });

  it("lets a Table scan through once the counter bill is paid / locked or at another location", () => {
    expect(
      openOrderPlace({ scan: "table", openTableIdHere: null, hasOpenCounterBillHere: false }),
    ).toEqual({ kind: "proceed" });
  });

  it("lets a Table scan through for a browser already at a table here (as before)", () => {
    expect(
      openOrderPlace({ scan: "table", openTableIdHere: 5, hasOpenCounterBillHere: false }),
    ).toEqual({ kind: "proceed" });
  });
});

describe("openPlaceMenuQuery", () => {
  it("points at the table's menu with the table notice", () => {
    expect(openPlaceMenuQuery({ kind: "toTable", tableId: 5 }, 1)).toEqual({
      locationId: 1,
      tableId: 5,
      notice: "atTable",
    });
  });

  it("points at the counter menu with the counter notice — no ids beyond the location", () => {
    expect(openPlaceMenuQuery({ kind: "toCounter" }, 1)).toEqual({
      locationId: 1,
      notice: "atCounter",
    });
  });
});

describe("parseOpenPlaceNotice", () => {
  it("accepts only the known flags", () => {
    expect(parseOpenPlaceNotice("atTable")).toBe("atTable");
    expect(parseOpenPlaceNotice("atCounter")).toBe("atCounter");
    expect(parseOpenPlaceNotice("anything")).toBeNull();
    expect(parseOpenPlaceNotice(undefined)).toBeNull();
  });
});
