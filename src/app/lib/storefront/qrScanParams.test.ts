import { describe, it, expect } from "vitest";
import { readQrScanParams } from "./qrScanParams";

const read = (query: string) => readQrScanParams(new URLSearchParams(query));

describe("readQrScanParams", () => {
  it("reads the ids and the key of a printed QR link", () => {
    expect(read("locationId=3&tableId=7&key=abc")).toEqual({
      locationId: 3,
      tableId: 7,
      key: "abc",
    });
  });

  it("gives null for anything missing", () => {
    expect(read("")).toEqual({ locationId: null, tableId: null, key: null });
  });

  it("treats a non-numeric or zero id, and an empty key, as missing", () => {
    expect(read("locationId=abc&tableId=0&key=")).toEqual({
      locationId: null,
      tableId: null,
      key: null,
    });
  });
});
