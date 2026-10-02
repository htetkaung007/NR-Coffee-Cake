import { Box, Typography } from "@mui/material";
import { AddonService, MenuCategoryService, MenuService } from "@/app/services";
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
  });
  if (!context) return fallback;
  const { companyId, location } = context;

  const [categories, addonCategories, menu] = await Promise.all([
    MenuCategoryService.getMenuCategories(companyId),
    AddonService.getAddonCategoriesWithAddonsList(),
    MenuService.getMenuById(menuId, location.locationId),
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
      initialData={menu}
    />
  );
}
