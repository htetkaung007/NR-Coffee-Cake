import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { LocalFileStorageService } from "@/app/lib/storage/LocalFileStorageService";

// The route test (CLAUDE.md §16's named exception): the real route over a
// real temp folder, removed afterwards — never the real UPLOAD_DIR.
const { roots } = vi.hoisted(() => ({ roots: { current: "" } }));

vi.mock("@/app/lib/storage/getFileStorageService", () => ({
  getFileStorageService: () => new LocalFileStorageService(roots.current),
}));

import { GET } from "./route";

const KEY = "menu/12-1730000000000-a1b2c3d4.webp";
const BYTES = Buffer.from("webp bytes");

beforeEach(async () => {
  roots.current = await mkdtemp(path.join(os.tmpdir(), "cafe-assets-"));
  await mkdir(path.join(roots.current, "menu"), { recursive: true });
  await writeFile(path.join(roots.current, KEY), BYTES);
});

afterEach(async () => {
  await rm(roots.current, { recursive: true, force: true });
});

/** The route as Next calls it — the path's segments, already decoded. */
function get(segments: string[]) {
  return GET(new Request("http://shop.local/assets/x"), {
    params: Promise.resolve({ key: segments }),
  });
}

describe("GET /assets/[...key]", () => {
  it("serves a stored file with its type, length and long-lived cache headers", async () => {
    const response = await get(KEY.split("/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Content-Length")).toBe(String(BYTES.length));
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(BYTES);
  });

  it("is 404 for a valid-looking key with no file", async () => {
    const response = await get(["menu", "12-1730000000000-ffffffff.webp"]);
    expect(response.status).toBe(404);
  });

  it("is 404 for every path-traversal or out-of-shape attempt", async () => {
    const secret = path.join(roots.current, "..", "secret.webp");
    await writeFile(secret, "secret");
    try {
      for (const segments of [
        ["..", "secret.webp"],
        ["menu", "..", "..", "secret.webp"],
        ["%2e%2e", "secret.webp"],
        ["..%2f..%2fsecret.webp"],
        [secret],
        ["", "etc", "passwd"],
        ["logo", "12-1730000000000-a1b2c3d4.webp"],
        ["menu", "12-1730000000000-a1b2c3d4.svg"],
        ["menu", "12-1730000000000-a1b2c3d4.png"],
        ["menu"],
        [],
      ]) {
        const response = await get(segments);
        expect(response.status, segments.join("/")).toBe(404);
      }
    } finally {
      await rm(secret, { force: true });
    }
  });
});
