import { menuAccess } from "./menuAccess";

/** A location as the landing page reads it — only these four fields
 *  ever leave the database for it. */
export interface LandingLocationFacts {
  id: number;
  name: string;
  isArchived: boolean;
  onlineMenuEnabled: boolean;
}

/**
 * Which locations the landing page (`/`) links to: those whose menu a
 * visitor WITHOUT a QR session may see — not archived, online menu on
 * (the one rule, menuAccess). Only id + name are returned, ordered by
 * name (locale-aware, so Myanmar names sort too). Pure.
 */
export function landingLocations(
  locations: readonly LandingLocationFacts[],
): { id: number; name: string }[] {
  return locations
    .filter(
      (location) =>
        menuAccess({
          hasQrSession: false,
          onlineMenuEnabled: location.onlineMenuEnabled,
          locationExists: true,
          isArchived: location.isArchived,
        }) === "menu",
    )
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}
