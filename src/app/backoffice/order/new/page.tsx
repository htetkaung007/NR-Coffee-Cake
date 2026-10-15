import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import {
  LocationService,
  MenuService,
  OrderListService,
  TableService,
} from "@/app/services";
import StaffOrderClient from "./StaffOrderClient";

/**
 * Design doc section 7. Reuses the SAME "which location is this user
 * currently working in" resolution every other Backoffice page uses
 * (LocationService.getSelectedLocation) rather than adding a new location
 * picker just for this page — a Manager's location is already fixed
 * via User.locationId, an Admin's via their switched SelectedLocation.
 */
export default async function NewStaffOrderPage({
  searchParams,
}: {
  /** ?for=<entry key>: opened from an order's "Add items" — the client
   *  checks it against what's open (lib/order/orderTarget). */
  searchParams: Promise<{ for?: string }>;
}) {
  const { for: forParam } = await searchParams;
  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "Please sign in to place an order.",
    access: "staff",
  });
  if (!scope) return fallback;
  const { companyId, userId } = scope;

  const selectedLocation = await LocationService.getSelectedLocation(
    userId,
    companyId,
  );
  if (!selectedLocation) {
    return (
      <StaffOrderClient
        locationId={null}
        userId={userId}
        tables={[]}
        occupancy={{ tables: [], counterBills: [] }}
        initialFor={null}
        menus={[]}
        categories={[]}
      />
    );
  }

  // The same menus, the same visible categories (via
  // MenuCategoryService.getVisibleCategories) and the same category order
  // as the customer menu. `categories` already holds only the categories
  // that contain at least one menu — the customer menu's tab rule.
  // Occupancy (In use / Free tables, open Counter bills) is refreshed by
  // the client's auto-refresh
  // (this page re-renders) and when the picker opens.
  const [tables, { menus, categories }, occupancy] = await Promise.all([
    TableService.getTablesByLocation(selectedLocation.locationId),
    MenuService.getMenusForLocation(selectedLocation.locationId),
    OrderListService.getTableOccupancy(selectedLocation.locationId),
  ]);

  return (
    <StaffOrderClient
      locationId={selectedLocation.locationId}
      userId={userId}
      occupancy={occupancy}
      initialFor={forParam ?? null}
      tables={tables.map((table) => ({
        id: table.id,
        name: table.name,
        isCounter: table.isCounter === true,
      }))}
      menus={menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        // For the menu side's မြန်မာ view only (display).
        nameMy: menu.nameMy ?? null,
        description: menu.description,
        descriptionMy: menu.descriptionMy ?? null,
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
