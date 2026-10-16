import { describe, it, expect } from "vitest";
import { isHttpsRequest } from "./secureCookie";

describe("isHttpsRequest", () => {
  it("is false for a plain-http LAN request", () => {
    expect(isHttpsRequest({ protocol: "http:" })).toBe(false);
  });

  it("is true for an https request", () => {
    expect(isHttpsRequest({ protocol: "https:" })).toBe(true);
  });

  it("trusts x-forwarded-proto https from a proxy or tunnel ending TLS", () => {
    expect(isHttpsRequest({ protocol: "http:", forwardedProto: "https" })).toBe(
      true,
    );
  });

  it("takes the first value when proxies list several", () => {
    expect(isHttpsRequest({ forwardedProto: "https, http" })).toBe(true);
    expect(isHttpsRequest({ forwardedProto: "http, https" })).toBe(false);
  });

  it("ignores case", () => {
    expect(isHttpsRequest({ forwardedProto: "HTTPS" })).toBe(true);
    expect(isHttpsRequest({ protocol: "HTTPS:" })).toBe(true);
  });

  it("lets x-forwarded-proto http win over the request's own protocol", () => {
    expect(isHttpsRequest({ protocol: "https:", forwardedProto: "http" })).toBe(
      false,
    );
  });

  it("falls back to the protocol when the header is empty", () => {
    expect(isHttpsRequest({ protocol: "https:", forwardedProto: "" })).toBe(true);
  });

  it("is false when nothing is known", () => {
    expect(isHttpsRequest({})).toBe(false);
  });
});
