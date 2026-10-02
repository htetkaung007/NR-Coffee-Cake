import { describe, it, expect } from "vitest";
import { classifyCameraError, parseCounterQrUrl } from "./counterQrScan";

const ORIGIN = "https://cafe.example";
const VALID = `${ORIGIN}/counter?locationId=1&tableId=5&key=awzy`;

describe("parseCounterQrUrl", () => {
  it("accepts this shop's counter QR", () => {
    expect(parseCounterQrUrl(VALID, ORIGIN)?.toString()).toBe(VALID);
  });

  it("rejects text that isn't a URL", () => {
    expect(parseCounterQrUrl("hello there", ORIGIN)).toBeNull();
  });

  it("rejects a URL on another site", () => {
    expect(
      parseCounterQrUrl("https://evil.example/counter?key=awzy", ORIGIN),
    ).toBeNull();
  });

  it("rejects the same host over a different scheme or port", () => {
    expect(
      parseCounterQrUrl("http://cafe.example/counter?key=awzy", ORIGIN),
    ).toBeNull();
    expect(
      parseCounterQrUrl("https://cafe.example:8443/counter?key=awzy", ORIGIN),
    ).toBeNull();
  });

  it("rejects another page of this shop", () => {
    expect(parseCounterQrUrl(`${ORIGIN}/menu?key=awzy`, ORIGIN)).toBeNull();
  });

  it("rejects a counter URL without a key", () => {
    expect(parseCounterQrUrl(`${ORIGIN}/counter?locationId=1`, ORIGIN)).toBeNull();
  });

  it("rejects a counter URL with an empty key", () => {
    expect(parseCounterQrUrl(`${ORIGIN}/counter?key=`, ORIGIN)).toBeNull();
  });

  it("rejects a javascript: URL", () => {
    expect(parseCounterQrUrl("javascript:alert(1)", ORIGIN)).toBeNull();
  });
});

/** A DOMException-like error, as getUserMedia rejects with. */
const named = (name: string) => Object.assign(new Error(name), { name });

describe("classifyCameraError", () => {
  it("reads a blocked permission as permissionDenied", () => {
    expect(classifyCameraError(named("NotAllowedError"))).toBe("permissionDenied");
  });

  it("reads a missing camera as noCamera", () => {
    expect(classifyCameraError(named("NotFoundError"))).toBe("noCamera");
  });

  it("reads an unsatisfiable camera request as noCamera", () => {
    expect(classifyCameraError(named("OverconstrainedError"))).toBe("noCamera");
  });

  it("reads a camera another app holds as cameraBusy", () => {
    expect(classifyCameraError(named("NotReadableError"))).toBe("cameraBusy");
  });

  it("reads anything else as unknown", () => {
    expect(classifyCameraError(named("AbortError"))).toBe("unknown");
    expect(classifyCameraError("boom")).toBe("unknown");
  });
});
