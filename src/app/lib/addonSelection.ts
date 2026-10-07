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

/** An add-on as the server-side check loads it. */
export interface AddonOption {
  id: number;
  name: string;
  /** Turned off for now (e.g. out of oat milk) — not pickable. */
  isAvailable: boolean;
  /** Deleted — never pickable. */
  isArchived: boolean;
}

/** Usable right now: on and not deleted. */
const isPickable = (addon: AddonOption) => addon.isAvailable && !addon.isArchived;

export type AddonSelectionProblem =
  | { kind: "unavailable"; name: string | null }
  | { kind: "unpicked"; groupName: string };

/**
 * The server's add-on check for an add / edit (Counter, Table QR drafts,
 * staff orders — OrderSessionCartService.validateAddonSelection):
 * 1. every picked add-on must exist, be ON and not deleted — a stale
 *    screen or a tampered request can't add a turned-off one (name in
 *    the problem; null for an id that doesn't exist);
 * 2. every required group needs a pick among its AVAILABLE options
 *    (findUnpickedRequiredGroup — the one required-group rule — fed
 *    only the pickable ones), so an all-off required group can't be
 *    satisfied.
 * First problem found, or null. Pure.
 */
export function findAddonSelectionProblem(
  selectedIds: readonly number[],
  pickedAddons: readonly AddonOption[],
  requiredGroups: readonly { name: string; options: readonly AddonOption[] }[],
): AddonSelectionProblem | null {
  for (const id of selectedIds) {
    const addon = pickedAddons.find((candidate) => candidate.id === id);
    if (!addon || !isPickable(addon)) {
      return { kind: "unavailable", name: addon?.name ?? null };
    }
  }
  const unpicked = findUnpickedRequiredGroup(
    selectedIds,
    requiredGroups.map((group) => ({
      name: group.name,
      addonIds: group.options.filter(isPickable).map((addon) => addon.id),
    })),
  );
  return unpicked ? { kind: "unpicked", groupName: unpicked.name } : null;
}

/** A group at a glance on the Add-ons page: how many options are on, and
 *  whether it BLOCKS ordering — a required group with no option on means
 *  every menu using it can't be ordered (findAddonSelectionProblem). */
export function addonGroupAvailability(
  isRequired: boolean,
  options: readonly { isAvailable: boolean }[],
) {
  const onCount = options.filter((option) => option.isAvailable).length;
  return { onCount, total: options.length, isBlocked: isRequired && onCount === 0 };
}
