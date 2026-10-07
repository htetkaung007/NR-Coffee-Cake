import { Box, Typography } from "@mui/material";
import {
  AddonService,
  LocationService,
  MenuCategoryService,
  MenuLocationService,
  MenuService,
} from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import MenuForm from "@/app/components/menuForm/MenuForm";

export default async function EditMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const menuId = Number(id);

  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to edit a menu.",
    access: "owner",
  });
  if (!context) return fallback;
  const { companyId, location } = context;

  const [categories, addonCategories, menu, menuLocations, currentLocation] =
    await Promise.all([
      MenuCategoryService.getMenuCategories(companyId),
      AddonService.getAddonCategoriesWithAddonsList(),
      MenuService.getMenuById(menuId, location.locationId),
      MenuLocationService.getMenuLocations(menuId, companyId),
      LocationService.getLocationById(location.locationId),
    ]);

  if (!menu) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Menu not found.</Typography>
      </Box>
    );
  }

  return (
    <MenuForm
      categories={categories}
      addonCategories={addonCategories}
      initialData={{
        ...menu,
        shownLocationIds: menuLocations
          .filter((entry) => entry.isShown)
          .map((entry) => entry.locationId),
      }}
      locations={menuLocations.map(({ locationId, name }) => ({ locationId, name }))}
      currentLocation={{
        locationId: location.locationId,
        name: currentLocation?.name ?? "this location",
      }}
    />
  );
}
