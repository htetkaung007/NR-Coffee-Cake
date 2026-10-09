import {
  MENU_CATEGORY_REQUIRED_MESSAGE,
  MENU_NAME_REQUIRED_MESSAGE,
  MENU_PRICE_POSITIVE_MESSAGE,
  MENU_PRICE_WHOLE_MESSAGE,
} from "../schemas/menu_menuCategorySchema";
import { NO_LOCATION_MESSAGE } from "./menuLocations";

export interface MenuFormProblem {
  field: "name" | "price" | "categories" | "locations";
  message: string;
}

/**
 * What's still missing on the menu form, in on-screen order, in the
 * schema's own words (createMenuSchema). UX only: it lets the form say
 * what's wrong next to the button before sending — the Server Action's
 * Zod check is still the real one.
 *
 * Price follows the schema's z.coerce.number(): an empty price is 0
 * ("greater than zero"); the whole-number rule is checked before the
 * sign, as `.int()` comes before `.positive()`. A location is required
 * only when the form shows the location checklist.
 */
export function menuFormProblems(input: {
  name: string;
  price: string;
  categoryIds: readonly number[];
  requiresLocation: boolean;
  shownLocationIds: readonly number[];
}): MenuFormProblem[] {
  const problems: MenuFormProblem[] = [];

  if (input.name.trim() === "") {
    problems.push({ field: "name", message: MENU_NAME_REQUIRED_MESSAGE });
  }

  const price = Number(input.price);
  if (!Number.isFinite(price)) {
    problems.push({ field: "price", message: MENU_PRICE_POSITIVE_MESSAGE });
  } else if (!Number.isInteger(price)) {
    problems.push({ field: "price", message: MENU_PRICE_WHOLE_MESSAGE });
  } else if (price <= 0) {
    problems.push({ field: "price", message: MENU_PRICE_POSITIVE_MESSAGE });
  }

  if (input.categoryIds.length === 0) {
    problems.push({ field: "categories", message: MENU_CATEGORY_REQUIRED_MESSAGE });
  }

  if (input.requiresLocation && input.shownLocationIds.length === 0) {
    problems.push({ field: "locations", message: NO_LOCATION_MESSAGE });
  }

  return problems;
}
