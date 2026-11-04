import { describe, it, expect } from "vitest";
import { classifyCameraError, classifyScannedCode } from "./counterQrScan";

const ORIGIN = "https://cafe.example";
/** Where the printed QR codes point (NEXTAUTH_URL) — the shop's LAN. */
const QR_ORIGIN = "http://192.168.1.89";
const QUERY = "locationId=1&tableId=5&key=awzy";
const VALID = `${ORIGIN}/counter?${QUERY}`;

const classify = (text: string, qrOrigin: string | null = QR_ORIGIN) =>
  classifyScannedCode(text, { currentOrigin: ORIGIN, qrOrigin });
const kind = (text: string, qrOrigin?: string | null) =>
  classify(text, qrOrigin).kind;
const counterUrl = (text: string, qrOrigin?: string | null) => {
  const result = classify(text, qrOrigin);
  return result.kind === "counter" ? result.url.toString() : null;
};

describe("classifyScannedCode — the counter QR", () => {
  it("accepts this shop's counter QR on the current origin, as before", () => {
    expect(counterUrl(VALID)).toBe(VALID);
  });

  it("accepts the counter QR printed with the shop's QR address, and goes to the CURRENT origin", () => {
    expect(counterUrl(`${QR_ORIGIN}/counter?${QUERY}`)).toBe(VALID);
  });

  it("keeps only locationId, tableId and key — extra query params and a hash are dropped", () => {
    expect(
      counterUrl(`${QR_ORIGIN}/counter?${QUERY}&next=/evil&utm=x#frag`),
    ).toBe(VALID);
  });

  it("never navigates anywhere but the current origin", () => {
    const result = classify(`${QR_ORIGIN}/counter?${QUERY}`);
    expect(result.kind === "counter" && result.url.origin).toBe(ORIGIN);
  });

  it("rejects a counter URL without a key", () => {
    expect(kind(`${ORIGIN}/counter?locationId=1`)).toBe("otherCode");
  });

  it("rejects a counter URL with an empty key", () => {
    expect(kind(`${ORIGIN}/counter?key=`)).toBe("otherCode");
  });
});

describe("classifyScannedCode — a counter QR from another address", () => {
  it("is otherAddress on an unknown origin", () => {
    expect(kind(`https://evil.example/counter?${QUERY}`)).toBe("otherAddress");
  });

  it("is otherAddress on the same host over a different scheme or port", () => {
    expect(kind(`http://cafe.example/counter?${QUERY}`)).toBe("otherAddress");
    expect(kind(`https://cafe.example:8443/counter?${QUERY}`)).toBe(
      "otherAddress",
    );
  });

  it("is otherAddress for the LAN address when no QR origin is configured", () => {
    expect(kind(`${QR_ORIGIN}/counter?${QUERY}`, null)).toBe("otherAddress");
  });
});

describe("classifyScannedCode — a table's QR", () => {
  it("is tableQr on this shop's own origin", () => {
    expect(kind(`${ORIGIN}/table?${QUERY}`)).toBe("tableQr");
  });

  it("is tableQr on any other origin too (it's only words, never followed)", () => {
    expect(kind(`${QR_ORIGIN}/table?${QUERY}`)).toBe("tableQr");
    expect(kind(`https://elsewhere.example/table?key=k`)).toBe("tableQr");
  });

  it("isn't a table QR without a key", () => {
    expect(kind(`${ORIGIN}/table?tableId=5`)).toBe("otherCode");
  });
});

describe("classifyScannedCode — anything else", () => {
  it("is otherCode for text that isn't a URL", () => {
    expect(kind("hello there")).toBe("otherCode");
  });

  it("is otherCode for another page of this shop", () => {
    expect(kind(`${ORIGIN}/menu?key=awzy`)).toBe("otherCode");
  });

  it("is otherCode for another site's page", () => {
    expect(kind("https://example.com/promo")).toBe("otherCode");
  });

  it("is otherCode for a javascript: URL, even one shaped like a counter link", () => {
    expect(kind("javascript:alert(1)")).toBe("otherCode");
    expect(kind("javascript://x/counter?key=awzy")).toBe("otherCode");
  });

  it("never returns a URL for anything but the counter QR", () => {
    for (const text of [
      `${ORIGIN}/table?${QUERY}`,
      `https://evil.example/counter?${QUERY}`,
      "hello",
    ]) {
      expect(classify(text)).not.toHaveProperty("url");
    }
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
