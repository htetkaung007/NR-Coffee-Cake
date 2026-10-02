import { LocationService, MenuCategoryService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import MenuCategoryOrderView from "./MenuCategoryOrderView";

export default async function MenuCategoriesPage() {
  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to view menu categories.",
  });
  if (!context) return fallback;
  const { companyId, location } = context;

  const { locationId } = location;
  const [visible, hidden, shopName] = await Promise.all([
    MenuCategoryService.getVisibleCategories(companyId, locationId),
    MenuCategoryService.getHiddenCategories(companyId, locationId),
    LocationService.getShopNameForLocation(locationId),
  ]);

  const toItem = (category: (typeof visible)[number]) => ({
    id: category.id,
    name: category.name,
    itemCount: category._count.menuMenuCategory,
  });

  return (
    <MenuCategoryOrderView
      categories={visible.map(toItem)}
      hiddenCategories={hidden.map(toItem)}
      shopName={shopName}
    />
  );
}
