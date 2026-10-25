import { createHash } from "node:crypto";
import { addDays } from "../shopDay";

/**
 * Menu view counting's pure rules (MenuViewService records; Reports
 * reads the per-day totals). Server only — it hashes with node:crypto.
 *
 * Who a viewer is: a phone with a QR session at the location — its
 * Table contributor token, or its Counter bill's root round
 * (billSessionId ?? id). Stored only as a sha256 hex of "table:<token>"
 * or "bill:<rootId>" (MenuViewSeen.viewerKey), never the raw token. An
 * online visitor (no QR session) has no key and is not counted.
 */

/** A QR customer at a location, as the view key is built from. */
export type MenuViewer =
  | { kind: "table"; contributorToken: string }
  | { kind: "bill"; billRootId: number };

/** The one-way key stored for a viewer (sha256 hex). */
export function viewerKeyFor(viewer: MenuViewer): string {
  const raw =
    viewer.kind === "table"
      ? `table:${viewer.contributorToken}`
      : `bill:${viewer.billRootId}`;
  return createHash("sha256").update(raw).digest("hex");
}

/** MenuViewSeen rows are kept this many shop days (they only dedupe
 *  today's views; the totals stay in MenuViewDaily). */
export const VIEW_SEEN_KEEP_DAYS = 90;

/** The oldest shop day still kept on `today` — rows with an earlier day
 *  are deleted. */
export function oldestKeptViewDay(today: string): string {
  return addDays(today, -VIEW_SEEN_KEEP_DAYS);
}
