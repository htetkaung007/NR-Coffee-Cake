import { ValidationError } from "@/app/lib/errors";
import { findAddonSelectionProblem } from "@/app/lib/cart/addonSelection";
import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";

type Tx = Prisma.TransactionClient;

/**
 * Server-held cart lines — what's left of them: the Table QR draft
 * (TableDraftService) is the one cart still built on the server (many
 * phones share it); the Counter and the staff New Order carts live in
 * the browser and reach the server only to be checked and sent. These
 * two helpers are that draft's: the add-on selection check and the line
 * as the client needs it back.
 */
export class OrderSessionCartService {
  /** A cart/draft line as the client needs it after an add or edit —
   *  with its addon links and their own price snapshots, so the
   *  client's line total (cartLineTotal) prices the add-ons exactly as
   *  the bill will. Used by TableDraftService's add/update. */
  static async getLineWithAddons(tx: Tx, orderId: number) {
    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      // Returned to the client by Server Actions: never the token (it's
      // the key to editing a Table draft — see lib/order/contributors.ts).
      omit: { contributorToken: true },
      include: { OrdersAddons: { include: { addon: true } } },
    });
  }

  /** Every picked add-on must be ON and not deleted, and every
   *  required addon category linked to this menu (see
   *  MenuAddonCategories) must have AT LEAST ONE of its AVAILABLE addons
   *  present in the given addonIds (the rule lives in
   *  findAddonSelectionProblem, built on findUnpickedRequiredGroup —
   *  shared with the browser-cart check validateCartLines; this loads
   *  the add-ons from the DB) — the same rules the menu dialog enforces,
   *  re-checked here since a client (or a stale screen) can't be trusted
   *  to have actually enforced them — a client can call the action
   *  directly.
   *  Doesn't check that every id in addonIds actually belongs to this
   *  menu's addon categories — a stray/unrelated addon id just gets
   *  attached to the order harmlessly, no different in kind from a
   *  customer being able to pick any menu's addons today. */
  static async validateAddonSelection(menuId: number, addonIds: number[]) {
    const optionSelect = {
      id: true,
      name: true,
      isAvailable: true,
      isArchived: true,
    } as const;
    const [pickedAddons, requiredCategoryLinks] = await Promise.all([
      prisma.addon.findMany({
        where: { id: { in: addonIds } },
        select: optionSelect,
      }),
      prisma.menuAddonCategories.findMany({
        where: {
          menuId,
          isArchived: false,
          addonCategory: { isRequired: true, isArchived: false },
        },
        select: {
          addonCategory: {
            select: {
              name: true,
              addons: { where: { isArchived: false }, select: optionSelect },
            },
          },
        },
      }),
    ]);

    // One rule for every caller (findAddonSelectionProblem): a turned-off
    // or deleted add-on is refused, and a required group counts only an
    // available option as a pick.
    const problem = findAddonSelectionProblem(
      addonIds,
      pickedAddons,
      requiredCategoryLinks.map((link) => ({
        name: link.addonCategory.name,
        options: link.addonCategory.addons,
      })),
    );
    if (problem?.kind === "unavailable") {
      throw problem.name
        ? new ValidationError(
            `"${problem.name}" is not available right now.`,
            "ADDON_UNAVAILABLE",
            { name: problem.name },
          )
        : new ValidationError(
            "That add-on is not available right now.",
            "ADDON_UNAVAILABLE_UNNAMED",
          );
    }
    if (problem?.kind === "unpicked") {
      throw new ValidationError(
        `Please choose an option for "${problem.groupName}".`,
        "ADDON_REQUIRED",
        { group: problem.groupName },
      );
    }
  }
}
