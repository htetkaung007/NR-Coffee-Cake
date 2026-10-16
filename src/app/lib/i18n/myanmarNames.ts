/**
 * Whether shop data names have their Myanmar twin — for the Backoffice's
 * "still English here" hints (the Add-ons panel's မြန်မာ view, the add-on
 * form's "Customer sees" preview). Pure.
 */

/** `my` is missing (null or blank) — the English name shows. */
export function hasNoMyanmarName(my: string | null | undefined): boolean {
  return (my ?? "").trim() === "";
}

/** Any name in a group still lacks a Myanmar name: the group's own (only
 *  once it has an English name — a blank, still-being-typed group name
 *  shows nothing to translate), or any of its options'. */
export function hasMissingMyanmarName(
  group: { name: string; nameMy: string | null | undefined },
  options: readonly { nameMy: string | null | undefined }[],
): boolean {
  return (
    (group.name.trim() !== "" && hasNoMyanmarName(group.nameMy)) ||
    options.some((option) => hasNoMyanmarName(option.nameMy))
  );
}
