import { requireBackofficeAccess } from "@/app/lib/backofficeContext";
import { LocationService, MenuService, TableService } from "@/app/services";
import StaffOrderClient from "./StaffOrderClient";

/**
 * Design doc section 7. Reuses the SAME "which location is this user
 * currently working in" resolution every other Backoffice page uses
 * (LocationService.getSelectedLocation) rather than adding a new location
 * picker just for this page — a Manager's location is already fixed
 * via User.locationId, an Admin's via their switched SelectedLocation.
 */
export default async function NewStaffOrderPage() {
  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "Please sign in to place an order.",
    access: "staff",
  });
  if (!scope) return fallback;
  const { userId } = scope;

  const selectedLocation = await LocationService.getSelectedLocation(userId);
  if (!selectedLocation) {
    return (
      <StaffOrderClient
        locationId={null}
        tables={[]}
        menus={[]}
        categories={[]}
      />
    );
  }

  // The same menus, the same visible categories (via
  // MenuCategoryService.getVisibleCategories) and the same category order
  // as the customer menu. `categories` already holds only the categories
  // that contain at least one menu — the customer menu's tab rule.
  const [tables, { menus, categories }] = await Promise.all([
    TableService.getTablesByLocation(selectedLocation.locationId),
    MenuService.getMenusForLocation(selectedLocation.locationId),
  ]);

  return (
    <StaffOrderClient
      locationId={selectedLocation.locationId}
      tables={tables.map((table) => ({
        id: table.id,
        name: table.name,
        isCounter: table.isCounter === true,
      }))}
      menus={menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        description: menu.description,
        // Today's price, for browsing — each added line gets its own
        // price snapshot on the server.
        price: menu.price,
        imageUrl: menu.imageUrl,
        categoryIds: menu.categoryRefs.map((category) => category.id),
        categoryNames: menu.categories,
        // The same inputs the customer menu gives MenuCard, which decides
        // availability itself (stock > 0 and not switched off).
        stockQuantity: menu.stockQuantity,
        isAvailable: !menu.isManuallyDisabled,
        hasAddonGroups: menu.hasAddonGroups,
      }))}
      categories={categories}
    />
  );
}
