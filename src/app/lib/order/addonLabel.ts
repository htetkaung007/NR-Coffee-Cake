/**
 * How a line's chosen add-ons read on every order screen: grouped by
 * their add-on group — "Temperature: Hot · Sweet: Low · Toppings:
 * Pearl, Jelly" — so two groups that share an option name ("Sweet: Low"
 * / "Ice: Low") can be told apart. Names are read live from Addon /
 * AddonCategories (never part of a price snapshot). Pure, client-safe.
 */
import { localizedText } from "@/app/lib/i18n/localizedText";

export interface AddonSelection {
  name: string;
  /** Its add-on group's name; missing (an old stored cart, a group not
   *  loaded) → the option name alone. */
  groupName?: string | null;
}

/** The selections grouped by group (groups in the order they first
 *  appear, options in the order given): "Group: A, B · Other: C". */
export function formatAddonSelections(
  addons: readonly AddonSelection[],
): string {
  const segments: { group: string | null; options: string[] }[] = [];
  const byGroup = new Map<
    string,
    { group: string | null; options: string[] }
  >();
  for (const addon of addons) {
    const group = addon.groupName?.trim() ? addon.groupName : null;
    if (group === null) {
      segments.push({ group: null, options: [addon.name] });
      continue;
    }
    const existing = byGroup.get(group);
    if (existing) {
      existing.options.push(addon.name);
    } else {
      const segment = { group, options: [addon.name] };
      byGroup.set(group, segment);
      segments.push(segment);
    }
  }
  return segments
    .map(({ group, options }) =>
      group === null ? options.join(", ") : `${group}: ${options.join(", ")}`,
    )
    .join(" · ");
}

/** A selection with its Myanmar names, as customer lines carry it. */
export interface LocalizableAddonSelection {
  name: string;
  nameMy?: string | null;
  groupName?: string | null;
  groupNameMy?: string | null;
}

/** The selections in the customer's language — BOTH the group and the
 *  option name through localizedText — ready for formatAddonSelections. */
export function localizeAddonSelections(
  locale: string,
  addons: readonly LocalizableAddonSelection[],
): AddonSelection[] {
  return addons.map((addon) => ({
    name: localizedText(locale, addon.name, addon.nameMy),
    groupName: addon.groupName
      ? localizedText(locale, addon.groupName, addon.groupNameMy)
      : null,
  }));
}
