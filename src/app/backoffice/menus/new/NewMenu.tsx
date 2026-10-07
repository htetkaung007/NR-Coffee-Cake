import {
  AddonService,
  LocationService,
  MenuCategoryService,
} from "@/app/services";
import MenuForm from "@/app/components/menuForm/MenuForm";

/** The create form's data — the caller (page.tsx) has checked the owner
 *  and resolved the selected location. */
export default async function NewMenu({
  companyId,
  currentLocationId,
}: {
  companyId: number;
  currentLocationId: number;
}) {
  const [categories, addonCategories, activeLocations, currentLocation] =
    await Promise.all([
      MenuCategoryService.getMenuCategories(companyId),
      AddonService.getAddonCategoriesWithAddonsList(),
      LocationService.getActiveLocations(companyId),
      LocationService.getLocationById(currentLocationId),
    ]);

  return (
    <MenuForm
      categories={categories}
      addonCategories={addonCategories}
      locations={activeLocations.map((location) => ({
        locationId: location.id,
        name: location.name,
      }))}
      currentLocation={{
        locationId: currentLocationId,
        name: currentLocation?.name ?? "this location",
      }}
    />
  );
}
