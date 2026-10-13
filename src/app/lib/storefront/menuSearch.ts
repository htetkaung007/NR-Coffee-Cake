/** The customer menu's search: a menu matches when its English OR its
 *  Myanmar name contains the search (trimmed, case-insensitive) —
 *  whichever language the customer chose. An empty search matches all.
 *  Pure. */
export function matchesMenuSearch(
  menu: { name: string; nameMy?: string | null },
  search: string,
): boolean {
  const term = search.trim().toLocaleLowerCase();
  if (term === "") return true;
  return [menu.name, menu.nameMy ?? ""].some((name) =>
    name.toLocaleLowerCase().includes(term),
  );
}
