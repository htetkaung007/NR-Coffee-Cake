/**
 * The add-on group form's Myanmar-name hints (Backoffice): how many
 * options have a Myanmar name, and what an empty Myanmar field shows.
 * Pure, client-safe.
 */

interface NamedRow {
  name: string;
  nameMy: string;
}

/** Of the rows that will be saved (an English name), how many also have
 *  a Myanmar name — "N of M have a Myanmar name". Blank = none. */
export function myanmarNameCount(rows: NamedRow[]): {
  named: number;
  total: number;
} {
  const saved = rows.filter((row) => row.name.trim() !== "");
  return {
    named: saved.filter((row) => row.nameMy.trim() !== "").length,
    total: saved.length,
  };
}

/** The Myanmar field's placeholder: what customers would see instead
 *  (the English name) once there is one. */
export function myanmarPlaceholder(englishName: string): string {
  const name = englishName.trim();
  return name === "" ? "Myanmar name" : `${name} (shown if empty)`;
}
