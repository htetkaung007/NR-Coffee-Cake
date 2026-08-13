import { Box, Typography } from "@mui/material";
import { AddonService, MenuService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import MenuForm from "@/app/components/menuForm/MenuForm";

export default async function NewMenuPage() {
  const { companyId } = await getSessionContext();

  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to create a menu.
        </Typography>
      </Box>
    );
  }

  const [categories, addonCategories] = await Promise.all([
    MenuService.getMenuCategories(companyId),
    AddonService.getAddonCategoriesWithAddonsList(),
  ]);

  return <MenuForm categories={categories} addonCategories={addonCategories} />;
}
