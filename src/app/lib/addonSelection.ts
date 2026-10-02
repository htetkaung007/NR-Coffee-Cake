/** A REQUIRED add-on group linked to a menu (MenuAddonCategories →
 *  AddonCategories.isRequired) with the ids of its (non-archived)
 *  add-ons — the customer must pick at least one of them. */
export interface RequiredAddonGroup {
  name: string;
  addonIds: readonly number[];
}

/**
 * THE required-add-on rule: every required group needs AT LEAST ONE of
 * its own add-ons among the picked ids. Returns the first group left
 * without a pick (its name goes in the message), or null when every
 * required group has one. Pure — the one place this rule lives, shared
 * by OrderSessionCartService.validateAddonSelection (Counter, Table QR
 * and staff add/edit, against the DB) and validateCartLines (the
 * browser-cart check).
 */
export function findUnpickedRequiredGroup<Group extends RequiredAddonGroup>(
  selectedIds: readonly number[],
  requiredGroups: readonly Group[],
): Group | null {
  return (
    requiredGroups.find(
      (group) => !group.addonIds.some((id) => selectedIds.includes(id)),
    ) ?? null
  );
}
