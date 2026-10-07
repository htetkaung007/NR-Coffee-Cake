import { LocationService, MenuCategoryService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import MenuCategoryOrderView from "./MenuCategoryOrderView";

export default async function MenuCategoriesPage() {
  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to view menu categories.",
    access: "owner",
  });
  if (!context) return fallback;
  const { companyId, location } = context;

  const { locationId } = location;
  const [visible, hidden, shopName, menusByCategory] = await Promise.all([
    MenuCategoryService.getVisibleCategories(companyId, locationId),
    MenuCategoryService.getHiddenCategories(companyId, locationId),
    LocationService.getShopNameForLocation(locationId),
    MenuCategoryService.getCategoryMenus(companyId, locationId),
  ]);

  // "N items" is the length of the list shown, so the two always agree.
  const toItem = (category: (typeof visible)[number]) => {
    const menus = menusByCategory.get(category.id) ?? [];
    return {
      id: category.id,
      name: category.name,
      itemCount: menus.length,
      menus,
    };
  };

  return (
    <MenuCategoryOrderView
      categories={visible.map(toItem)}
      hiddenCategories={hidden.map(toItem)}
      shopName={shopName}
    />
  );
}
