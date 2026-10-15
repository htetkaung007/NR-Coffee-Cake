/**
 * The menu detail's "what's chosen / what's missing" — the customer's
 * add-on picks, keyed by add-on group id. Display only (the server
 * re-checks every pick). Pure.
 */
import { localizedText } from "@/app/lib/i18n/localizedText";

interface ChoiceGroup {
  id: number;
  name: string;
  nameMy?: string | null;
  isRequired: boolean;
  addons: { id: number; name: string; nameMy?: string | null }[];
}

/** The required groups with nothing picked yet, in the order given (the
 *  detail shows required groups first). */
export function missingRequiredGroups<Group extends ChoiceGroup>(
  groups: readonly Group[],
  selected: Readonly<Record<number, readonly number[]>>,
): Group[] {
  return groups.filter(
    (group) => group.isRequired && (selected[group.id] ?? []).length === 0,
  );
}

/** "Hot · Large · Pearl" — every picked option's name in `locale`, in
 *  the groups' order and each group's own option order; "" when nothing
 *  is picked. */
export function choiceSummary(
  locale: string,
  groups: readonly ChoiceGroup[],
  selected: Readonly<Record<number, readonly number[]>>,
): string {
  return groups
    .flatMap((group) =>
      group.addons.filter((addon) =>
        (selected[group.id] ?? []).includes(addon.id),
      ),
    )
    .map((addon) => localizedText(locale, addon.name, addon.nameMy))
    .join(" · ");
}
